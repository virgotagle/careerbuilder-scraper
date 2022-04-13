const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");

(async () => {
  const keywords = "Nurse";
  const location = "Huntington Beach";
  const list = await getJobList(keywords, location);
  createXLS(keywords, location, list);
})();

async function getJobList(keywords, location, index = 1, list = []) {
  try {
    const results = await axios({
      url: `https://www.careerbuilder.com/jobs?keywords=${encodeURI(keywords)}&location=${encodeURI(location)}&page_number=${index}`,
      method: "GET",
    });
    const parsedJobList = parseJobList(results.data);
    if (parsedJobList.length === 25) return getJobList(keywords, location, (index += 1), list.concat(parsedJobList));
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
    const node = $(linkSelector);
    if (node.length) {
      const publishTime = $(`${dataSelector} > div.data-results-publish-time`).text();
      const jobTitle = $(`${dataSelector} > div.data-results-title.dark-blue-text.b`).text();
      const details = $(`${dataSelector} > div.data-details`)
        .text()
        .split("\n")
        .filter((str) => str.trim());
      const companyName = details.shift().trim();
      const jobType = details.pop().trim();
      const location = details.join(" ");
      const [a] = node;
      const label = a.attribs["aria-label"];
      const ipath = a.attribs["data-ipath"];
      const jobDid = a.attribs["data-job-did"];
      const href = a.attribs.href;
      list.push({ publishTime, companyName, jobTitle, jobType, location, label, ipath, jobDid, href });
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
    wb.SheetNames.push(name);
    const ws = XLSX.utils.aoa_to_sheet(arr);
    wb.Sheets[name] = ws;
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
}
