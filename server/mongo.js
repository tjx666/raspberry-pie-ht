const mongoose = require('mongoose');

const DB = 'ht';
const HOST = '127.0.0.1';
const PORT = 27017;
const ADDR = `mongodb://${HOST}:${PORT}/${DB}`;
mongoose.connect(ADDR, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

console.log(`Connected to mongoDB at ${ADDR}`);
