export async function summarizeContent(websiteText: string, linkedinPosts: string[]) {
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
  }
  