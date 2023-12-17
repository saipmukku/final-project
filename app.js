// Variable declarations
const http = require('http');
const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const axios = require('axios');
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') });

const uri = process.env.MONGO_CONNECTION_STRING;
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const {MongoClient, ServerApiVersion} = require('mongodb');

const app = express();

const portNumber = process.argv[2];

// Express endpoints
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));

app.get("/", async (request, response) => {
    let {quote, author} = await getQuote();
    response.render("home.ejs", {quote: quote, author: author});
});

app.get("/addTask", (request, response) => {
    response.render("addTask.ejs", {portNumber: portNumber, taskAdded: ""});
});

app.post("/addTask", async (request, response) => {
    let {quote, author} = await getQuote();
    const {title, description, dueDate, priority, status} = request.body;

    addTask({title, description, dueDate, priority, status});

    response.render("home.ejs", {quote: quote, author: author});
});

app.get("/viewTasks", async (request, response) => {
    const tasksArray = await viewAllTasks();
    let table = `<table style="border: 2px solid black"><tr><th>Title</th><th>Description</th><th>Due Date</th><th>Priority</th><th>Status</th></tr>`;

    for(task in tasksArray) {
        table += `<tr style="border: 2px solid black">`;
        table += `<td>${tasksArray[task].title}</td>`;
        table += `<td>${tasksArray[task].description}</td>`;
        const date = tasksArray[task].dueDate;
        const year = date.substring(0, 4);
        const month = date.substring(5, 7);
        const day = date.substring(8, 10);
        const time = date.substring(11, 16);
        table += `<td>${month}/${day}/${year} Time: ${time}</td>`;
        table += `<td>${tasksArray[task].priority}</td>`;
        table += `<td>${tasksArray[task].status}</td></tr>`;
    }

    table += "</table>";

    response.render("viewTasks.ejs", {table: table});
});

app.get("/remove", (request, response) => {
    removeAllTasks();

    response.render("remove.ejs");
})

app.listen(portNumber);

// Functions
async function addTask(task) {
    const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});

    try {
        await client.connect();
        await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(task);
    } catch (e) {
        
    } finally {
        await client.close();
    }
}

async function viewAllTasks() {
    const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});

    try {
        await client.connect();
        let filter = {};
        const cursor = await client.db(databaseAndCollection.db)
                                .collection(databaseAndCollection.collection)
                                .find(filter);
        const result = await cursor.toArray();

        return result;
    } catch (e) {

    } finally {
        await client.close();
    }
}

async function removeAllTasks() {
    const client = new MongoClient(uri, {serverApi: ServerApiVersion.v1});

    try {
        await client.connect();
        let filter = {};
        const count = await client.db(databaseAndCollection.db)
                                    .collection(databaseAndCollection.collection)
                                    .countDocuments();
        const result = await client.db(databaseAndCollection.db)
                                    .collection(databaseAndCollection.collection)
                                    .deleteMany(filter);
        return await count;
    } catch (e) {

    } finally {
        await client.close();
    }
}

async function getQuote() {
    let quote, author;
    try {
        const fetchResponse = await axios.get('https://type.fit/api/quotes');
        const quotes = fetchResponse.data;
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const randomQuote = quotes[randomIndex];

        quote = randomQuote.text;
        author = randomQuote.author;

        // Check if author is only 'type.fit' and replace with 'Anonymous'
        if (!author || author.trim() === "type.fit") {
            author = 'Anonymous';
        } else {
            // Remove ", type.fit" from the author's name
            author = author.replace(', type.fit', '');
        }
    } catch (error) {
        console.error('Error fetching quote:', error);
        quote = "It is never too late to be what you might have been.";
        author = "George Eliot";
    }
    return {quote, author};
}