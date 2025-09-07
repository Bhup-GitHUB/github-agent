import {config} from 'dotenv';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {exec} from 'child_process';
import {promisify} from 'util';

config();

const execAsync = promisify(exec);

if (!process.env.GEMINI_API_KEY){
    console.log(" api key is not set/ doesnt exist ");
    process.exit(1);
}

const genAi= new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model= genAi.getGenerativeModel({model: "gemini-1.5-flash"});