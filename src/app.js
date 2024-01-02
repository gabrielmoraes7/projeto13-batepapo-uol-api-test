//importação das bibliotecas utilizadas
import { MongoClient, ObjectId } from 'mongodb';
import express, {json} from 'express';
import dayjs from 'dayjs';
import chalk from 'chalk';
import joi from 'joi';
import {config} from 'dotenv';
import cors from 'cors';
import { stripHtml } from 'string-strip-html';

//conexão local ao banco de dados Mongo pela variavel local no dotenv
config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
const app = express();
const port = 5000; //porta onde vai ser hosteado o servidor local
app.use(cors());
app.use(json());

//formato dos objetos das mensagens a serem guardadas/exibidas
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required(),
});

const db = mongoClient.db();


// Inicio das requisições POST e GET
app.post('/participants', async (req, res) => {

    let { name } = req.body;

    if(!isNaN(name))return res.sendStatus(422);

    if (name) {
        name = stripHtml(name.toString()).result.trim();
    }

    const userSchema = joi.object({
        name: joi.any().required()
    });
 
    //valida a formatação dos dados do usuario
    const validation = userSchema.validate(req.body, { abortEarly: false });

    //detalha em caso de erros de validação 
    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    if(name === "") return res.status(422).send('Por favor, preencha o nome!');

    try {
        const hasUser = await db.collection('participants').findOne({ name });
        if (hasUser) {
            console.log(`Usuario ${name} já está logado`);
            return res.status(409).send('Usuario já existe!');
        }
        else {
            await db.collection('participants').insertOne({
                name,
                lastStatus: Date.now()
            });

            await db.collection('messages').insertOne(
                {
                from: name,
                to: 'Todos',
                text: 'entra na sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss'),
                }
            );
            return res.sendStatus(201);
        }
    } catch (error) {
        return res.status(500).send(error.message);
    }
    
});  

//rota get /participants
app.get('/participants', async (req, res) => {
    try {
        const participants = await db.collection('participants').find().toArray();
        return res.status(200).send(participants);
    } catch (error) {
        return res.status(500).send(error.message);
    } 
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});