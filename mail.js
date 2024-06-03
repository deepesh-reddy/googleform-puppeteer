const puppeteer = require('puppeteer');
const fs = require('fs'); // Import the fs module
const twilio = require('twilio');
const { DEFAULT_VIEWPORT } = require('puppeteer');

async function getQuestionAndOptions() {
  const browser = await puppeteer.launch({
    headless : false,
    defaultViewport : false,
    args : ["--start-maximized"]
  });
  const page = await browser.newPage();
  await page.goto('https://docs.google.com/forms/d/e/1FAIpQLSd9azDlHpIL0xT6TyG74cMWqUVbKnw_IlANRNVByJYoCa2DVQ/viewform?usp=sf_link');

  // Get the question element(s)
  const questionElements = await page.$$eval('.z12JJ', (elements) => {
    return elements.map((element) => {
      console.log('Question Element:', element);
      const questionText = element.querySelector('.M4DNQ').textContent;
      console.log('Question Text:', questionText);
      const options = Array.from(element.querySelectorAll('.tyNBNd'), (option) => option.textContent);
      console.log('Options:', options);
      return { questionText, options };
    });
  });

  // Create a string to store the questions and options
  let questionsAndOptions = '';

  // Loop through the questionElements and append to the string
  questionElements.forEach((question, index) => {
    questionsAndOptions += `Question ${index + 1}: ${question.questionText}\n`;
    question.options.forEach((option, optionIndex) => {
      questionsAndOptions += ` Option ${optionIndex + 1}: ${option}\n`;
    });
    questionsAndOptions += '\n'; // Add a newline after each question
  });

  // Write the questionsAndOptions string to a text file
  fs.writeFileSync('questions.txt', questionsAndOptions);

//-----------------------------------------------------------------------------------

const fileContents = fs.readFileSync('questions.txt', 'utf8');

// Split the contents into an array of lines
const lines = fileContents.split('\n');

// Loop through the lines and process the questions and options
const questions = [];
let currentQuestion = null;

for (const line of lines) {
  if (line.startsWith('Question')) {
    // If the line starts with 'Question', create a new question object
    currentQuestion = {
      text: line.replace('Question ', '').split(':')[1].trim(),
      options: []
    };
    questions.push(currentQuestion);
  } else if (line.startsWith(' Option')) {
    // If the line starts with ' Option', add it to the current question's options
    if (currentQuestion) {
      const option = line.replace(' Option ', '').split(':')[1].trim();
      currentQuestion.options.push(option);
    }
  }
}

// Print the questions and options
for (const question of questions) {
  console.log(`Question: ${question.text}`);
  for (const option of question.options) {
    console.log(`  Option: ${option}`);
  }
  console.log();
}



//----------------------------------------------------------------------------------
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
run('questions.txt')
.then(() => {
  // Call sendTextMessage after run function completes
  sendTextMessage();
})
.catch((error) => {
  console.error('Error:', error);
});
//----------------------------------------------------------------------------------
//4
//7
//3
//1
function sendTextMessage() {
  // Replace with your Twilio account SID and auth token
  const accountSid = 'AC8270e325f887d541b669ad2d88651c6';
  const authToken = 'de817a70ad8b19148738de0d5b5d17d';

  // Replace with your phone numbers (including country codes)
  const fromNumber = '+1205483218';
  const toNumber = '+91938159192';

  const client = require('twilio')(accountSid, authToken);

  // Read the contents of the search_results.txt file
  const searchResults = fs.readFileSync('search_results.txt', 'utf8');

  // Split the contents into an array of messages (max 1600 characters per message)
  const messages = splitMessageBody(searchResults, 1600);

  // Send each message via Twilio
  messages.forEach((messageBody, index) => {
    client.messages
      .create({
        body: `${index + 1}/${messages.length}: ${messageBody}`,
        from: fromNumber,
        to: toNumber,
      })
      .then((message) => console.log(`Text message sent: ${message.sid}`))
      .catch((error) => console.error('Error sending text message:', error));
  });
}

// Helper function to split the message body into chunks of maximum 1600 characters
function splitMessageBody(text, maxLength) {
  const result = [];
  const regex = new RegExp(`.{1,${maxLength}}`, 'g');
  const matches = text.match(regex);
  if (matches) {
    result.push(...matches);
  }
  return result;
}

//----------------------------------------------------------------------------------


  await browser.close();
}

getQuestionAndOptions();



