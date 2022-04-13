const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

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

(async () => {
  const keywords = "Programmer";
  const location = "Huntington Beach";
  const list = await getJobList(keywords, location);
  console.log(list);
})();
