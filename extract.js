import fs from 'fs';

// Try to read the chat history to extract the json
const historyStr = process.env.CHAT_HISTORY || "";
// Wait, chat history might not be in env. 
