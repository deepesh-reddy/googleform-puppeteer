const puppeteer = require('puppeteer');
const fs = require('fs');

function readQuestions(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data.split('\n').filter(line => line.trim() !== ''); // Remove empty lines
  } catch (error) {
    console.error('Error reading questions file:', error);
    return [];
  }
}

async function run(questionsFilePath) {
  try {
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
    const page = await browser.newPage();

    const questions = readQuestions(questionsFilePath);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`Query (${i + 1}/${questions.length}): ${question}`);

      await page.goto(`https://www.google.com/search?q=${question}`, { waitUntil: 'networkidle0' });

      const results = await scrapeResults(page);

      // Construct content with question number, two blank lines, and formatted results
      const content = [
        `Question ${i + 1}: ${question}`,
        '\n\n', // Two blank lines after the question
        ...results.map(result => `${result}\n`), // Add a newline after each scraped result
        '\n'.repeat(5), // Five blank lines for separation between questions
      ].join('');

      // Append content to existing file or create a new one
      const fileName = 'search_results.txt';
      fs.appendFileSync(fileName, content, 'utf8'); // Append mode
      console.log(`Results for question ${i + 1} saved to ${fileName}`);
    }

    await browser.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function scrapeResults(page) {
  const results = [];
  const resultElements = await page.$$eval('#rso > div', (divs) =>
    divs.filter((div) => div.querySelector('h3')).map((div) => div.querySelector('h3').textContent)
  );
  results.push(...resultElements);
  return results;
}

// Replace 'questions.txt' with your actual file path if it's different
run('questions.txt');
