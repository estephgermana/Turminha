// routes/sales.js

import { Request, RequestHandler, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import { uri, dbName, userCollectionName, cartCollectionName, collectionName } from '../config/database';
import nodemailer from 'nodemailer';

const client = new MongoClient(uri);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'estephani.germana@gmail.com',
        pass: 'tdup byzz bnbe regj'
    }
});

export const completeSale: RequestHandler = async (req: Request, res: Response) => {
    const { paymentMethod } = req.body;
    const userId = req.user?.userId;

    try {
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        await client.connect();
        const database = client.db(dbName);
        const cartCollection = database.collection(cartCollectionName);
        const productsCollection = database.collection(collectionName);
        const salesCollection = database.collection('sales');
        const userCollection = database.collection(userCollectionName);

        const items = await cartCollection.find({ userId: new ObjectId(userId) }).toArray();

        if (items.length === 0) {
            return res.status(400).json({ error: "Carrinho vazio. Não é possível concluir a venda." });
        }

        const saleDetails = [];

        for (const item of items) {
            const product = await productsCollection.findOne({ _id: new ObjectId(item.productId) });

            if (!product) {
                return res.status(404).json({ error: "Produto não encontrado no estoque" });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
            }

            await productsCollection.updateOne(
                { _id: new ObjectId(item.productId) },
                { $inc: { stock: -item.quantity } }
            );

            saleDetails.push({
                productId: item.productId,
                productName: product.name,
                quantity: item.quantity,
                price: product.price * item.quantity
            });
        }

        const user = await userCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const sale = {
            userId: new ObjectId(userId),
            userName: user.nome || 'Usuário',
            userEmail: user.email || 'email@exemplo.com',
            timestamp: new Date(),
            items: saleDetails,
            paymentMethod: paymentMethod
        };

        const result = await salesCollection.insertOne(sale);
        await cartCollection.deleteMany({ userId: new ObjectId(userId) });

        const postmanMessage = `Olá ${user.nome || 'Usuário'}, Sua compra foi realizada com sucesso. Detalhes da compra: ${saleDetails.map(item => `${item.productName}, R$${item.price.toFixed(2)}, Pagamento: ${paymentMethod}`).join('\n')}Obrigado por comprar com a TurminhaDoAgro!`;
        const emailMessage = `Olá ${user.nome || 'Usuário'}, espero que esteja bem!!\n\nSua compra foi realizada com sucesso! Já vamos preparar seu pedido para envio.\n\nDetalhes da compra:\nVocê adquiriu o(s) produto(s):\n${saleDetails.map(item => `${item.productName}`).join(', ')}\nValor: R$${saleDetails.reduce((acc, item) => acc + item.price, 0).toFixed(2)}\nMétodo de Pagamento: ${paymentMethod}\n\nObrigado por comprar com a TurminhaDoAgro!`;

        const mailOptions = {
            from: 'turminhadoagro9@gmail.com',
            to: user.email || 'email@exemplo.com',
            subject: 'Confirmação de Compra - TurminhaDoAgro',
            text: emailMessage
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Erro ao enviar email:', error);
                return res.status(500).json({ error: 'Erro ao enviar email de confirmação' });
            } else {
                console.log('Email enviado:', info.response);
                res.json({
                    message: postmanMessage,
                    saleId: result.insertedId
                });
            }
        });
    } catch (error) {
        console.error('Erro ao concluir a venda:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } 
};

export const getSalesHistory: RequestHandler = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        await client.connect();
        const database = client.db(dbName);
        const salesCollection = database.collection('sales');

        const sales = await salesCollection.find({ userId: new ObjectId(userId) }).toArray();

        res.json(sales);
    } catch (error) {
        console.error('Erro ao buscar histórico de vendas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    } 
};
