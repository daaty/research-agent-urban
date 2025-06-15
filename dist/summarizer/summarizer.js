"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeContent = summarizeContent;
function summarizeContent(websiteText, linkedinPosts) {
    return __awaiter(this, void 0, void 0, function* () {
        // VERY basic summarization (you can improve this later using LLMs)
        const topics = linkedinPosts.map(post => post.split(' ').slice(0, 5).join(' ')); // first 5 words
        const news = linkedinPosts.find(post => post.toLowerCase().includes('raised')) || '';
        const clientNews = linkedinPosts.find(post => post.toLowerCase().includes('client')) || '';
        const blogPosts = linkedinPosts.find(post => post.toLowerCase().includes('blog') || post.toLowerCase().includes('article')) || '';
        return {
            topics,
            news,
            clientNews,
            blogPosts
        };
    });
}
