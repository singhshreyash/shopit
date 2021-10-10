const app = require('./app')
const connectDatabase = require('./config/database')

const dotenv = require('dotenv');

//handle the Uncaught Exception
process.on('uncaughtException', err => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down Server due to Uncaught Exception`)
    process.exit(1);
})

//setting up the config file
dotenv.config({ path: 'backend/config/config.env' })

//connecting to DB
connectDatabase();

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on Port: ${process.env.PORT} in ${process.env.NODE_ENV} mode`)
})

//Handle Unhandled Promise rejection
process.on('unhandledRejection', err => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down server due to unhandled rejection`);
    server.close(()=> {
        process.exit(1);
    })
})