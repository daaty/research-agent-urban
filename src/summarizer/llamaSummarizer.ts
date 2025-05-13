import fetch from 'node-fetch';


const OLLAMA_URL = 'http://localhost:11434/api/generate'; // ← assuming your Ollama runs here

async function summarizeWithLlama(prompt: string): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral',    // your ollama model
        prompt: prompt,
        stream: false,
      }),
    });
  
    if (!response.ok) {
      throw new Error(`Ollama API call failed with status: ${response.status}`);
    }
  
    const data = await response.json();
    return data.response.trim();
  }  

  export async function summarizeContentWithOllama(websiteText: string, linkedinPosts: string[]): Promise<any> {
    try {
      const websitePrompt = `
  Summarize the following website content into 5-6 lines focusing on key services, expertise, and offerings:
  "${websiteText}"
      `;
      const websiteSummary = await summarizeWithLlama(websitePrompt);
  
      const linkedinPrompt = `
  Summarize the following LinkedIn posts into major topics, client news, blog posts, and important announcements:
  "${linkedinPosts.join('\n\n')}"
      `;
      const linkedinSummary = await summarizeWithLlama(linkedinPrompt);
  
      return {
        websiteSummary,
        linkedinSummary
      };
    } catch (error) {
      console.error('Error during summarization:', error);
      throw error;
    }
  }
  