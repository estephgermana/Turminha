import { Request, Response, NextFunction } from 'express';
import { MongoClient, Db } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { uri, dbName, userCollectionName } from '../config/database';
import { User, NewUser } from '../types/types';
import { RequestHandler } from 'express-serve-static-core';

const client = new MongoClient(uri);
let db: Db;

const secretKey = process.env.JWT_SECRET_KEY || '12315548174154615164145164'; // Use uma chave secreta segura



const connectToDatabase = async () => {
    if (!db) {
        await client.connect();
        db = client.db(dbName);
    }
};

export const authenticateToken: RequestHandler = async (req: Request & { user?: User }, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.sendStatus(401);

        const decodedToken = jwt.verify(token, secretKey) as User;
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Erro ao autenticar token:', error);
        res.sendStatus(403);
    }
};

export const registerUser: RequestHandler = async (req: Request, res: Response) => {
    
    try {
        await connectToDatabase();
        const collection = db.collection(userCollectionName);

        const { nome, email, senha }: NewUser = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
        }

        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'E-mail já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);

        const result = await collection.insertOne({ nome, email, senha: hashedPassword });
        res.status(201).json({ message: 'Usuário cadastrado com sucesso', userId: result.insertedId });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
        }

        await connectToDatabase();
        const database = client.db(dbName);
        const collection = database.collection(userCollectionName);

        const user = await collection.findOne({ email });

        if (!user || !(await bcrypt.compare(senha, user.senha))) {
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        }

        const accessToken = jwt.sign({ userId: user._id, nome: user.nome, email: user.email }, secretKey, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login bem-sucedido', nome: user.nome, accessToken });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

export const listUsers: RequestHandler = async (req: Request, res: Response) => {
    try {
        await connectToDatabase();
        const collection = db.collection(userCollectionName);

        const users = await collection.find({}).toArray();
        res.json(users);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};
