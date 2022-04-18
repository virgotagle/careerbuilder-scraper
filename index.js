const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment");
const XLSX = require("xlsx");
const _ = require("lodash");
(async () => {
  const keywords = "Programmer";
  const location = "Huntington Beach";
  const list = await getJobList(keywords, location);
  createXLS(keywords, location, _.sortBy(list, ["publishDateOrder"], ["desc"]));
})();

async function getJobList(keywords, location, index = 1, list = []) {
  try {
    const results = await axios({
      url: `https://www.careerbuilder.com/jobs?keywords=${encodeURI(keywords)}&location=${encodeURI(location)}&page_number=${index}`,
      method: "GET",
    });
    const parsedJobList = parseJobList(results.data);
    index += 1;
    if (parsedJobList.length === 25) return getJobList(keywords, location, index, list.concat(parsedJobList));
    return list.concat(parsedJobList);
  } catch (error) {
    return [];
  }
}

function parseJobList(html) {
  const list = [];
  const $ = cheerio.load(html);
  for (let index = 1; index < 26; index++) {
    const mainSelector = `#jobs_collection > li:nth-child(${index})`;
    const dataSelector = `${mainSelector} > div > div.col.big.col-mobile-inline`;
    const linkSelector = `${mainSelector} > a`;
    const nodes = $(linkSelector);
    if (nodes.length) {
      const publishTime = $(`${dataSelector} > div.data-results-publish-time`).text();
      const publishDateOrder = publishTime === "Today" ? 0 : +publishTime.split(" ")[0];
      const publishDate =
        publishTime === "Today"
          ? moment().format("YYYY-MM-DD")
          : moment()
              .add(+publishTime.split(" ")[0], "day")
              .format("YYYY-MM-DD");
      const jobTitle = $(`${dataSelector} > div.data-results-title.dark-blue-text.b`).text();
      const details = $(`${dataSelector} > div.data-details`)
        .text()
        .split("\n")
        .filter((str) => str.trim());
      const companyName = details.shift().trim();
      const jobType = details.pop().trim();
      const location = details.join(" ");
      const [a] = nodes;
      const label = a.attribs["aria-label"];
      const iPath = a.attribs["data-ipath"];
      const jobDid = a.attribs["data-job-did"];
      const href = a.attribs.href;
      list.push({ publishTime, publishDate, publishDateOrder, companyName, jobTitle, jobType, location, label, iPath, jobDid, href });
    } else break;
  }
  return list;
}

function createXLS(keywords, location, list) {
  if (list && list.length) {
    const name = `${keywords}-${location}`;
    let arr = [["Publish Time", "Job Title", "Company Name", "Location", "Details Link"]];
    list.forEach((obj) => arr.push([obj.publishTime, obj.jobTitle, obj.companyName, obj.location, `https://www.careerbuilder.com${obj.href}`]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(arr);

    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
}
