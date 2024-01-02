//importação das bibliotecas utilizadas
import { mongoClient, MongoClient, ObjectId } from 'mongodb';
import express, {json} from 'express';
import dayjs from 'dayjs';
import chalk from 'chalk';
import Joi from 'joi';
import dotenv from 'dotenv';
import cors from 'cors';

//conexão local ao banco de dados Mongo pela variavel local no dotenv
dotenv.config();
const MongoClient = new MongoClient(process.env.DATABASE_URL);
const app = express();

//formato dos objetos das mensagens a serem guardadas/exibidas
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required(),
});

start();
async function start() {

    app.use(cors());
    app.use(json());

    app.listen(process.env.PORT, () => {
        console.log(`Conexão feita na porta: ${process.env.PORT}`);
    });

    try {
        await mongoClient.connect();
        console.log('Conexão ao banco de dados feita com exito!!');
    } catch (err) {
        console.log(chalk.bold.red(err.message));
    }
}

const db = mongoClient.db();

