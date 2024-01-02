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

//rota post /messages - Salvar as mensagens
app.post('/messages', async (req, res) => {

    const { to, text, type } = req.body;
    const user = req.headers.user == undefined ? '' : Buffer.from(req.headers['user'], 'latin1').toString('utf-8');
    
    if (user === '') {
        return res.sendStatus(422);
    }

    try {
        const userLoggedIn = await db.collection('participants').findOne({ name: user });

        if (!userLoggedIn) {
            return res.sendStatus(422);
        }
    } catch (error) {
        return res.status(500).send(error.message);
    } 

    const validation = messageSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);
    }

    try {
        await db.collection('messages').insertOne({
            from: user,
            to: stripHtml(to).result.trim(),
            text: stripHtml(text).result.trim(),
            type: stripHtml(type).result.trim(),
            time: dayjs().format('HH:mm:ss')
        });
        return res.sendStatus(201);
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

//requisição de Mensagens - GET
app.get('/messages', async (req, res) => {
    try {
        const { limit } = req.query;
        const user = Buffer.from(req.headers['user'], 'latin1').toString('utf-8');
        if (limit) {

            if (isNaN(limit) || (!isNaN(limit) && limit <= 0)) return res.sendStatus(422);

            const dbMessages = await db.collection('messages')
                .find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }, { type: 'message' },], }).toArray();
                return res.send([...dbMessages].reverse().slice(0, limit).reverse());
        } else {
            console.log(chalk.bold.green(`User ${user} has requested all messages`));
            const dbMessages = await db.collection('messages')
                .find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }] }).toArray();

                return res.send([...dbMessages]);
        }
    } catch (error) {
        return res.status(500).send(error.message);
    }
});

//requisição de Status - POST
app.post('/status', async (req, res) => {
    const user = req.headers.user;
    if (!user) {
        return res.sendStatus(404);
    }

    const db = mongoClient.db();
    const participantsCollection = db.collection('participants');
    const participantExists = await participantsCollection.findOne({ name: user });
    
    if (!participantExists) {
        return res.sendStatus(404);
    }

    await participantsCollection.updateOne(
        { name: user },
        { $set: { lastStatus: Date.now() } }
    );
    res.sendStatus(200);
});

setInterval(async () => {
    try {
        const participants = await db.collection('participants').find({ lastStatus: { $lte: Date.now() - 10000 } }).toArray();

        participants.forEach(async (participant) => {

            await db.collection('messages').insertOne({
                from: participant.name,
                to: 'Todos',
                text: `sai da sala...`,
                type: 'status',
                time: dayjs().format('HH:mm:ss'),
            });

            db.collection('participants').deleteOne({
                name: participant.name,
            });
        });

    } catch (error) {
        console.log(error.message);
    }
}, 15000);


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});