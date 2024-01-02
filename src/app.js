//importação das bibliotecas utilizadas
import { MongoClient, MongoClient, ObjectId } from 'mongodb';
import express, {json} from 'express';
import chalk from 'chalk';
import dayjs from 'dayjs';
import Joi from 'joi';
import dotenv from 'dotenv';
import cors from 'cors';

//conexão local ao banco de dados Mongo pela variavel local no dotenv
dotenv.config();
const MongoClient = new MongoClient(process.env.DATABASE_URL);
const app = express();

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required(),
});

start();

