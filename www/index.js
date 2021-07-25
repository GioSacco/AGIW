const puppeteer       = require('puppeteer');
const cheerio         = require('cheerio');
const stopword        = require('stopword');
const TfIdf           =  require( 'tf-idf-search' ); 
const utils      = require('./service/utils.js')

const firstDataSet    = require('../assets/secondDataSet.json');
const secondDataSet   = require('../assets/tirthDataSet.json');

process.setMaxListeners(0);

initFirstDataSet();

async function initFirstDataSet() {

  var firstDatasetUrlList = firstDataSet;
  var secondDatasetUrlList = secondDataSet;

  let [firstDatasetContentDataList, secondDatasetContentDataList] = await Promise.all([fetchDataFirstDataSet(firstDatasetUrlList), fetchDataSecondDataSet(secondDatasetUrlList)]);

  initSecondDataSet(firstDatasetContentDataList, secondDatasetContentDataList);

}

async function initSecondDataSet(firstDatasetContentDataList, secondDatasetContentDataList) {

  var secondDatasetContentDataListString = [];
  for (j = 0; j <= secondDatasetContentDataList.length-1; j++) {
    secondDatasetContentDataList[j] = stopword.removeStopwords(secondDatasetContentDataList[j]);

    var yyy = secondDatasetContentDataList[j].toString();
    yyy = yyy.replaceAll(',', ' ');
    secondDatasetContentDataListString.push(yyy);

  }

  var similarityPageList = [];
  var totalSimilarityValue = 0;

  for (i = 0; i <= firstDatasetContentDataList.length-1; i++) {
    firstDatasetContentDataList[i] = stopword.removeStopwords(firstDatasetContentDataList[i]);

    var firstDatasetContentDataSinglePageString =  firstDatasetContentDataList[i].toString();
    firstDatasetContentDataSinglePageString = firstDatasetContentDataSinglePageString.replaceAll(',', ' ');

    var localSimilarityPageList = [];

    for (k = 0; k <= secondDatasetContentDataListString.length-1; k++) {
      tf_idf = new TfIdf();
      tf_idf.createCorpusFromStringArray ([secondDatasetContentDataListString[k]]);

      var search_result = tf_idf.rankDocumentsByQuery(firstDatasetContentDataSinglePageString);

      var currentSimilarityValue = search_result.reduce((a,b)=>a.similarityIndex>b.similarityIndex?a:b).similarityIndex;
      var currentSimilarityContent = search_result.reduce((a,b)=>a.similarityIndex>b.similarityIndex?a:b).document
  
      const first_page_url = firstDatasetContentDataList[i][firstDatasetContentDataList[i].length-1];
      var first_page_url_single_word = '';
      var first_page_url_array = first_page_url.replaceAll('/', ' ').split(" ");

      if (i < firstDatasetContentDataList.length -1) {
        first_page_url_array = first_page_url_array.filter(x => !firstDatasetContentDataList[i+1][firstDatasetContentDataList[i+1].length-1].includes(x));
        first_page_url_single_word = first_page_url_array.toString().replaceAll(',', ' ').replaceAll('-', ' ').replaceAll('_', ' ');
      } else {
        first_page_url_array = first_page_url_array.filter(x => !firstDatasetContentDataList[i-1][firstDatasetContentDataList[i-1].length-1].includes(x));
        first_page_url_single_word = first_page_url_array.toString().replaceAll(',', ' ');
      }

      const second_page_url = currentSimilarityContent[currentSimilarityContent.length-1];
      var second_page_url_single_word = ''
      var second_page_url_array = second_page_url.replaceAll('/', ' ').split(" ");

      if (k < secondDatasetContentDataListString.length -1) {
        second_page_url_array = second_page_url_array.filter(x => !secondDatasetContentDataListString[k+1].includes(x));
        second_page_url_single_word = second_page_url_array.toString().replaceAll(',', ' ').replaceAll('-', ' ').replaceAll('_', ' ');
      } else {
        second_page_url_array = second_page_url_array.filter(x => !secondDatasetContentDataListString[k-1].includes(x));
        second_page_url_single_word = second_page_url_array.toString().replaceAll(',', ' ').replaceAll('-', ' ').replaceAll('_', ' ');
      }


      tf_idf_2 = new TfIdf();
      tf_idf_2.createCorpusFromStringArray ([second_page_url_single_word]);

      var search_result_2 = tf_idf_2.rankDocumentsByQuery(first_page_url_single_word);
    
      currentSimilarityValue = currentSimilarityValue + search_result_2[0].similarityIndex;

      if (currentSimilarityValue > 0) {
        localSimilarityPageList.push({
            "first_page": first_page_url,
            "second_page": second_page_url,
            "similarity": currentSimilarityValue
        });
      }
    } 

    if (localSimilarityPageList.length > 0) {
      var maxSimilarityValue = localSimilarityPageList.reduce((a,b)=>a.similarity>b.similarity?a:b).similarity;

      if (maxSimilarityValue > 0) {
        totalSimilarityValue = totalSimilarityValue + maxSimilarityValue;
        similarityPageList.push(localSimilarityPageList.reduce((a,b)=>a.similarity>b.similarity?a:b));
      }

    }
 
  }

  similarityPageList = similarityPageList.filter(item => {
    return item.similarity > (totalSimilarityValue / similarityPageList.length);
  }); 
    
  console.log(similarityPageList);
  console.log(similarityPageList.length);

}

async function fetchDataFirstDataSet(urlList){

    var textList = [];

    var sampleFirstContentPage = null;

    const browser = await puppeteer.launch();

    for ( const url of urlList ) {

        console.log(url);
  
          const page = await browser.newPage();
          page.setCacheEnabled(false);
          const html = await page.goto(url, {waitUntil: "networkidle2", timeout: 15000}).then(function() {
              return page.content();
            }).catch(e => void 0);

            const $ = cheerio.load(html, {
                xml: {
                    normalizeWhitespace: true,
                }
            }, false);

            $('footer').remove();
            $('script').remove();
            $('style').remove();

            var t = $('body *').contents().map(function() {
                return (this.type === 'text') ? $(this).text(): ' ';
            }).get().join(' ');

            if (!sampleFirstContentPage) {
              sampleFirstContentPage = t;
            } else {
              test = t.split(" ")
              test = test.filter(x => !sampleFirstContentPage.includes(x));
              test.push('_PAGEURL_:'+url);
              textList.push(test);

              if (url == urlList[urlList.length-1]) {
                test = sampleFirstContentPage.split(" ")
                test = test.filter(x => !t.includes(x));
                test.push('_PAGEURL_:'+urlList[0]);
                textList.push(test);
              }

            }
    }
    
    return textList;

}

async function fetchDataSecondDataSet(urlList){

  var textList = [];

  const browser = await puppeteer.launch();

  var sampleFirstContentPage = null;

  for ( const url of urlList ) {
    
      console.log(url);
        
        page = await browser.newPage();
        page.setCacheEnabled(false);
        html = await page.goto(url, {waitUntil: "networkidle2", timeout: 15000}).then(function() {
            return page.content();
          }).catch(e => void 0);

          const $ = cheerio.load(html, {
              xml: {
                  normalizeWhitespace: true,
              }
          }, false);

          $('footer').remove();
          $('script').remove();
          $('style').remove();
          $('ul.player-news__list').remove()

          var t = $('body *').contents().map(function() {
              return (this.type === 'text') ? $(this).text(): ' ';
          }).get().join(' ');

          if (!sampleFirstContentPage) {
            sampleFirstContentPage = t;
          } else {
            test = t.split(" ")
            test = test.filter(x => !sampleFirstContentPage.includes(x));
            test.push('_PAGEURL_:'+url);
            textList.push(test);

            if (url == urlList[urlList.length-1]) {
              test = sampleFirstContentPage.split(" ")
              test = test.filter(x => !t.includes(x));
              test.push('_PAGEURL_:'+urlList[0]);
              textList.push(test);
            }

          }       

  }
  
  return textList;

}