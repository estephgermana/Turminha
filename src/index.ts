import express from 'express';
import cors from 'cors';
import path from 'path';
import { registerUser, loginUser, authenticateToken, listUsers } from './controllers/authController';
import { addItemToCart, viewCart, removeItemFromCart } from './controllers/cartController';
import { addProduct, deleteProduct, listProducts, updateProduct } from './controllers/productController';
import { completeSale, getSalesHistory } from './controllers/salesController'; // Importe o getSalesHistory
import { MongoClient } from 'mongodb';
import { uri, dbName, userCollectionName } from './config/database';


const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar para servir os arquivos estáticos
app.use(express.static(path.join(__dirname, '../src')));
app.use(express.static(path.join(__dirname, '../src/componentes')));

// Definindo as rotas

// Rotas de autenticação
app.post('/register', registerUser);
app.post('/login', loginUser);

// Rotas do carrinho
app.post('/cart', authenticateToken, addItemToCart);
app.get('/cart', authenticateToken, viewCart);
app.delete('/cart/:productId', authenticateToken, removeItemFromCart);

// Rota para concluir uma venda
app.post('/sales', authenticateToken, completeSale);
// Rota para obter o histórico de compras com autenticação
app.get('/sales/history', authenticateToken, getSalesHistory);

// Rotas de produtos
app.post('/products', authenticateToken, addProduct);
app.delete('/products/:id', authenticateToken, deleteProduct);
app.get('/products', listProducts);
app.put('/products/:id', authenticateToken, updateProduct); 

// Rota de listar usuários
app.get('/users', authenticateToken, listUsers);

// Configuração do servidor
const client = new MongoClient(uri);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src/index.html'));
  });

app.listen(port, async () => {
    try {
        await client.connect();
        console.log(`Server is listening on port ${port}`);
    } catch (error) {
        console.error('Error while connecting to the database:', error);
    }
});
