# Project: Research Agent

**Objective:**
This project automates the extraction and summarization of content from company websites and LinkedIn profiles using a locally hosted LLM (Mistral via Ollama) and web scraping techniques.

**Core Functionality:**
* Scrapes designated company websites and LinkedIn profiles (requires authenticated session for LinkedIn).
* Utilizes a local Mistral LLM instance via Ollama for content summarization.
* Employs carefully engineered prompts to generate structured summaries.
* Operates without reliance on external LLM APIs.

**Technology Stack:**
* **Web Scraping:** Puppeteer / Playwright
* **LLM Engine:** Ollama (running Mistral model locally)
* **Language:** TypeScript (following Clean Architecture principles)


**Example Output (Loopio):**

* **Website Summary:** Loopio is presented as an RFP automation platform simplifying response management with features like a secure content library and AI assistance. It emphasizes collaboration, consistency, integration capabilities (CRM, Slack, etc.), flexible pricing, and dedicated support. Its AI is user-controlled, focusing on data-driven insights, human review, and quality control.
* **LinkedIn Summary (Profile: Matt York):** Key topics identified include Machine Learning opportunities at Loopio and Employee Appreciation Day reflections. Updates mention hiring for a Senior ML Engineer (Remote, Toronto-based) and celebrating team growth despite challenges. No formal blog posts were detected; content resembled internal updates. No major company announcements beyond hiring and cultural posts were noted.

**Usage:**
1.  Ensure the Ollama server is running with the Mistral model available (`ollama run mistral`).
2.  Start the Node.js backend server (e.g., `npm run dev`).
3.  Send a POST request to the `/api/scrape` endpoint with the target URLs in the JSON body:
    ```bash
    curl -X POST http://localhost:3000/api/scrape \
    -H "Content-Type: application/json" \
    -d '{"companyUrl":"[https://loopio.com/](https://loopio.com/)", "linkedinUrl":"[https://www.linkedin.com/in/myork/](https://www.linkedin.com/in/myork/)"}'
    ```
4.  The API will return a JSON response containing the generated summaries.
