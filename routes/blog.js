const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Mock data for topics that can be generated daily
const topics = [
    { title: "Top 10 Temp Mail Use Cases 2026", slug: "top-10-temp-mail-use-cases-2026", category: "Privacy" },
    { title: "Why Your Real Email is a Privacy Risk", slug: "real-email-privacy-risk", category: "Security" },
    { title: "The Evolution of Disposable Email", slug: "evolution-disposable-email", category: "History" },
    { title: "How to Keep Your Inbox Clean in 2026", slug: "keep-inbox-clean-2026", category: "Tutorial" },
    { title: "The Dangers of Sharing Your Primary Email", slug: "dangers-primary-email", category: "Security" },
    { title: "How Temp Mail Protects You from Phishing", slug: "temp-mail-phishing-protection", category: "Security" },
    { title: "Free vs Paid Temp Mail: What's Better?", slug: "free-vs-paid-temp-mail", category: "Guide" },
    { title: "Using Temp Mail for Online Shopping", slug: "temp-mail-online-shopping", category: "E-commerce" },
    { title: "How to Use AgencyMail for Maximum Privacy", slug: "agencymail-maximum-privacy", category: "Tutorial" },
    { title: "The Future of Digital Identity in 2026", slug: "future-digital-identity-2026", category: "Tech" },
    { title: "How to Protect Your OTP from Hackers", slug: "protect-otp-hackers", category: "Security" },
    { title: "Why Businesses Use Temporary Emails", slug: "businesses-temp-emails", category: "Business" },
    { title: "The Ultimate Guide to Digital Anonymity", slug: "ultimate-guide-digital-anonymity", category: "Privacy" },
    { title: "How to Spot a Phishing Email in Seconds", slug: "spot-phishing-email", category: "Security" },
    { title: "Why Data Privacy is the New Human Right", slug: "data-privacy-human-right", category: "Ethics" },
    { title: "How to Manage Multiple Social Media Accounts Safely", slug: "manage-multiple-social-accounts", category: "Social" },
    { title: "The Impact of AI on Email Security", slug: "ai-email-security-impact", category: "Tech" },
    { title: "How to Stay Safe on Public Wi-Fi", slug: "safe-public-wi-fi", category: "Security" },
    { title: "The Best Privacy Tools for 2026", slug: "best-privacy-tools-2026", category: "Tools" },
    { title: "How to Delete Your Digital Footprint", slug: "delete-digital-footprint", category: "Privacy" },
];

const DATA_PATH = path.join(__dirname, '../data/blogs.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Helper to get or generate blogs
function getBlogs() {
    if (!fs.existsSync(DATA_PATH)) {
        // If the file doesn't exist, create it with the initial blogs
        fs.writeFileSync(DATA_PATH, JSON.stringify(initialBlogs, null, 2));
        return initialBlogs;
    }

    let blogs = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

    // Check if we need to generate a new blog for today
    const today = new Date().toISOString().split('T')[0];
    const hasToday = blogs.some(b => b.date.startsWith(today));

    if (!hasToday && blogs.length < topics.length + 3) {
        // Generate new blog from topics
        const existingSlugs = new Set(blogs.map(b => b.slug));
        const availableTopics = topics.filter(t => !existingSlugs.has(t.slug));

        if (availableTopics.length > 0) {
            const topic = availableTopics[0]; // Pick the first available topic
            const newBlog = {
                ...topic,
                excerpt: `Discover why ${topic.title.toLowerCase()} is crucial for your digital security in 2026.`,
                date: today,
                author: "AgencyMail AI",
                readTime: "4 min read",
                content: `
                    <h2>${topic.title}</h2>
                    <p>In today's digital age, ${topic.title.toLowerCase()} is more relevant than ever. At AgencyMail, we believe in providing the tools you need to stay safe online.</p>
                    <p>When you use a temporary email service, you're not just avoiding spam; you're actively protecting your digital footprint. This is especially important when considering ${topic.title.toLowerCase()}.</p>
                    <h3>Key Benefits</h3>
                    <ul>
                        <li>Enhanced Security: Keep your primary data safe.</li>
                        <li>Spam Prevention: Never deal with unwanted marketing again.</li>
                        <li>Instant Access: Get your verification codes in seconds.</li>
                    </ul>
                    <p>We'll continue to update our platform to ensure you have the best experience possible. Stay tuned for more insights into ${topic.category.toLowerCase()} and digital privacy.</p>
                `
            };
            blogs.unshift(newBlog);
            fs.writeFileSync(DATA_PATH, JSON.stringify(blogs, null, 2));
        }
    }

    return blogs;
}

// Initial 3 blogs (the ones the user requested)
const initialBlogs = [
    {
        slug: "best-temp-mail-services-2026",
        title: "Best Temp Mail Services 2026",
        excerpt: "Discover the top-rated temporary email services of 2026 that offer the best security, speed, and reliability for your disposable email needs.",
        date: "2026-03-18",
        category: "Security",
        author: "AgencyMail Team",
        readTime: "5 min read",
        content: `
          <p>In 2026, protecting your digital identity is more important than ever. With the rise of data breaches and intrusive marketing, temporary email services have become an essential tool for every internet user.</p>
          <h2>Why AgencyMail Leads the Pack</h2>
          <p>AgencyMail stands out in 2026 by offering a seamless user experience, lightning-fast email retrieval, and support for multiple high-quality providers.</p>
        `
    },
    {
        slug: "how-to-avoid-spam-emails",
        title: "How to Avoid Spam Emails",
        excerpt: "Learn effective strategies and tools to keep your primary inbox clean and free from annoying spam and promotional emails.",
        date: "2026-03-15",
        category: "Privacy",
        author: "AgencyMail Team",
        readTime: "4 min read",
        content: `
          <p>Spam emails are not just annoying; they can be dangerous. From phishing attempts to malware delivery, your inbox is a prime target for malicious actors.</p>
          <h2>1. Use Temporary Emails for Signups</h2>
          <p>This is the single most effective way to avoid spam. When you need to download a whitepaper, use a disposable email address.</p>
        `
    },
    {
        slug: "free-temporary-email-for-otp",
        title: "Free Temporary Email for OTP",
        excerpt: "Need to verify an account with an OTP? Find out how to use free temporary email services to receive verification codes securely and quickly.",
        date: "2026-03-12",
        category: "Tutorial",
        author: "AgencyMail Team",
        readTime: "3 min read",
        content: `
          <p>Many online services require email verification or One-Time Passwords (OTP) to complete registration. Here's how to use a temporary email for OTP verification.</p>
        `
    }
];

// Initialize blogs if file doesn't exist
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(initialBlogs, null, 2));
}

router.get('/', (req, res) => {
    try {
        const blogs = getBlogs();
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
});

router.get('/:slug', (req, res) => {
    try {
        const blogs = getBlogs();
        const blog = blogs.find(b => b.slug === req.params.slug);
        if (blog) {
            res.json(blog);
        } else {
            res.status(404).json({ error: "Blog not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blog" });
    }
});

module.exports = router;
