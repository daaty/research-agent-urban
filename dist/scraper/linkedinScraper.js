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
exports.scrapeLinkedIn = scrapeLinkedIn;
const playwright_1 = require("playwright"); // Already imported
function scrapeLinkedIn(linkedinUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield playwright_1.chromium.launch({
            headless: false, // <<==== MAKE IT FALSE to see browser
            slowMo: 50 // <<==== (optional) slow down actions so you can manually log in
        });
        const page = yield browser.newPage();
        yield page.goto(linkedinUrl, { waitUntil: 'load' });
        // ❗❗ WAIT here so you can manually login
        console.log("🛑 Waiting for you to login manually... please login into LinkedIn in the opened browser.");
        yield page.waitForTimeout(60000); // wait 60 seconds for manual login
        // After login, continue scraping...
        const posts = yield page.$$eval('div.feed-shared-update-v2', elements => elements.map(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }));
        yield browser.close();
        return posts;
    });
}
