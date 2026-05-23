const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const mongoose = require('mongoose');
const cookies = require('cookie-parser');
const jwt = require('jsonwebtoken');
const port = 3000;
const Groq = require("groq-sdk");
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
const PORT = process.env.PORT || 3000;
const userModel = require('./models/user');
const quizModel = require('./models/quiz');
const companyModel = require('./models/companies');
const problemModel = require('./models/problem');
const bcrypt = require('bcrypt');
app.use(express.static('public'));

app.use(express.json());
app.set('view engine', 'ejs');
app.use(cookies());
app.use(express.urlencoded({extended : true}));
const groq = new Groq({ apiKey: process.env.grok_api_key });
function isloggedin(req, res, next) {
   if (!req.cookies || !req.cookies.token) {
      return res.status(401).send("You must be logged in");
   }

   try {
      let data = jwt.verify(req.cookies.token, "secretkey");
      req.user = data;

      next();
   } catch (err) {
      return res.status(401).send("Invalid token");
   }
}

app.get('/', (req, res) => {
    res.render('index');
});
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
   try {
      let { email, password } = req.body;

      if (!email || !password) {
         return res.status(400).send("Email and password required");
      }
      let user = await userModel.findOne({ email });
      if (!user) {
         return res.status(404).send("User not found");
      }
       let isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
         return res.status(401).send("Invalid credentials");
      }
      else{
      let token =  jwt.sign({email:email,userid:user._id}, "secretkey");
        res.cookie("token",token);
         res.redirect("./dashboard");

      }
   } catch (err) {
      console.log(err);
      return res.status(500).send("Server error");
   }
});
app.get("/forgot-password", (req, res) => {
   res.render("./forgot-password");
});
app.get("/register", (req, res) => {
   res.render("./index");
})
   app.get("/top",isloggedin, (req, res) => {
   res.render("./top");
})
app.post('/register',async (req, res) => {
   let {username, name, age, email,goal, password} = req.body;
   let user = await userModel.findOne({email});
   if (user) return res.status(500).send("user already exists");

   bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(password, salt, async function(err, hash) {
        let user = await userModel.create({
            username,
            name,
            age,
            email,
            goal,
            password : hash

        });
        let token =  jwt.sign({email:email,userid:user._id}, "secretkey");
        res.cookie("token",token);
        res.render("./login")
    
});
})
})
app.get('/logout', (req, res) => {
    res.cookie("token","");
   res.redirect('/login');
});

app.get('/addpro', isloggedin, async (req, res) => {
  res.render("addpro")
});  
app.get('/dashboard', isloggedin, async (req, res) => {
   res.render("das")

});

app.get('/quiz',isloggedin, async (req, res) => {
   res.render("addquiz");
});
app.get('/companies',isloggedin, async (req, res) => {
   const userid = req.user.userid;

   const total = await companyModel.countDocuments({ userid });
   const aptest = await companyModel.countDocuments({
    userid,
    reached: "aptitude"
     });
   const techexam = await companyModel.countDocuments({
    userid,
    reached: "technical"
  });
  const techinter = await companyModel.countDocuments({
    userid,
    reached: "technical-interview"
  });
  const hrinter = await companyModel.countDocuments({
    userid,
    reached: "hr-interview"
  });
  const rejected = await companyModel.countDocuments({
    userid,
    reached: "rejected"
  });
   res.render("companies.ejs",{
      total,
      aptest,
      techexam,
      techinter,
      hrinter,
      rejected
   });
});
app.post("/companies",isloggedin, async (req, res) => {
   let {companyname, position, platform,reached, feedbackrecieved, result} = req.body;
   
   let company = await companyModel.create({
      companyname,
      position,
      platform,
      reached,
      feedbackrecieved,
      result,
      userid:req.user.userid
   });
   const userid = req.user.userid;

   const total = await companyModel.countDocuments({ userid });
   const aptest = await companyModel.countDocuments({
    userid,
    reached: "aptitude"
     });
   const techexam = await companyModel.countDocuments({
    userid,
    reached: "technical"
  });
  const techinter = await companyModel.countDocuments({
    userid,
    reached: "technical-interview"
  });
  const hrinter = await companyModel.countDocuments({
    userid,
    reached: "hr-interview"
  });
  const rejected = await companyModel.countDocuments({
    userid,
    reached: "rejected"
  });
   res.render("companies.ejs",{
      total,
      aptest,
      techexam,
      techinter,
      hrinter,
      rejected
   });
});
app.post("/solution", isloggedin, async (req, res) => {

    try {

        const {
            problemtitle,
            difficulty,
            language
        } = req.body;

        const chatCompletion =
            await groq.chat.completions.create({

            model: "llama-3.3-70b-versatile",

            messages: [

                {
                    role: "system",
                    content: `
You are a technical assistant.

Return ONLY valid JSON.

No markdown.
No explanations outside JSON.
`
                },

                {
                    role: "user",
                    content: `
Provide a coding solution.

Problem: "${problemtitle}"
Language: "${language}"
Difficulty: "${difficulty}"

Rules:
- Return ONLY valid JSON
- No markdown
- "result" must contain only code

Format:

{
  "problemtitle": "",
  "result": "",
  "explanation": "",
  "timeComplexity": "",
  "spaceComplexity": "",
  "topic": ""
}
`
                }

            ],

            response_format: {
                type: "json_object"
            }

        });

        let content =
            chatCompletion.choices[0].message.content;

        content = content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const data = JSON.parse(content);

        if (
            !data.result ||
            !data.explanation
        ) {
            throw new Error("Invalid AI response");
        }

        res.render("problem", data);

    }
    catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to generate solution"
        });

    }

});
app.post("/quiz", isloggedin, async (req, res) => {
    try {
        const { topic, difficulty, Language, numofques } = req.body;
        const language = Language; 

        if (!topic || !difficulty || !language) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        let targetQuestionCount = parseInt(numofques, 10);
        if (isNaN(targetQuestionCount) || targetQuestionCount < 1) {
            targetQuestionCount = 5; 
        } else if (targetQuestionCount > 10) {
            targetQuestionCount = 10; 
        }

        const chatCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.2, 
            messages: [
                {
                    role: "system",
                    content: "You are a strict JSON api backend. You must output a JSON object matching the user's schema perfectly. Do not wrap code in backticks."
                },
                {
                    role: "user",
                    content: `
Generate exactly ${targetQuestionCount} multiple-choice questions.

Topic: "${topic}"
Difficulty: "${difficulty}"
Language: "${language}"

Rules:
- Generate exactly ${targetQuestionCount} distinct questions
- Exactly 4 options per question
- Only 1 correct answer
- The string value in "answer" must exactly match one of the strings inside the "options" array.
- No duplicate questions
- No duplicate options

Return JSON in this format:
{
  "questions": [
    {
      "question": "The question string or short code snippet here",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "answer": "Choice A"
    }
  ]
}
`
                }
            ],
            response_format: {
                type: "json_object"
            }
        });

        let content = chatCompletion.choices[0].message.content;

        content = content
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const data = JSON.parse(content);

        if (!data.questions || !Array.isArray(data.questions)) {
            throw new Error("Invalid quiz format");
        }

        res.render("quiz", { quizzes: data.questions });


    } catch (error) {
        console.error("Groq Generation Error: ", error);
        res.status(500).json({
            success: false,
            message: "Quiz generation failed"
        });
    }
});
const companyPositionsDB = {
    "google": { 
        name: "Google", 
        roles: [ 
            { id: "sde", title: "Software Engineer", tag: "Core DSA & System Design" }, 
            { id: "frontend", title: "Frontend Engineer", tag: "React, JavaScript, UI Systems" },
            { id: "backend", title: "Backend Engineer", tag: "Node.js, Go, Distributed Systems" },
            { id: "ml", title: "Machine Learning Engineer", tag: "TensorFlow, Python, AI Models" },
            { id: "data-scientist", title: "Data Scientist", tag: "Statistics, Big Data, Predictive Modeling" },
            { id: "cloud", title: "Cloud Engineer", tag: "GCP, Infrastructure, Kubernetes" },
            { id: "sre", title: "Site Reliability Engineer", tag: "System Uptime, Automation, Linux" },
            { id: "pm", title: "Product Manager", tag: "Strategy, Agile, User Stories" },
            { id: "security", title: "Security Engineer", tag: "Cryptography, Network Security" },
            { id: "ux", title: "UI/UX Designer", tag: "Figma, User Research, Prototyping" }
        ] 
    },
    "microsoft": { 
        name: "Microsoft", 
        roles: [ 
            { id: "sde", title: "Software Engineering (SDE)", tag: "DSA, OS, DBMS Algorithms" }, 
            { id: "cloud", title: "Cloud Solution Architect", tag: "Azure, DevOps, Networking" },
            { id: "fullstack", title: "Full Stack Developer", tag: ".NET, C#, React" },
            { id: "ai", title: "AI/ML Engineer", tag: "OpenAI integrations, Python" },
            { id: "data-analyst", title: "Data Analyst", tag: "Power BI, SQL, Excel" },
            { id: "devops", title: "DevOps Engineer", tag: "CI/CD, GitHub Actions, Docker" },
            { id: "pm", title: "Program Manager", tag: "Cross-team leadership, Delivery" },
            { id: "security", title: "Cybersecurity Analyst", tag: "Threat Modeling, Identity Access" },
            { id: "sdet", title: "SDET", tag: "Test Automation, Quality Assurance" },
            { id: "hardware", title: "Hardware Engineer", tag: "Embedded Systems, C++" }
        ] 
    },
    "amazon": { 
        name: "Amazon", 
        roles: [ 
            { id: "sde", title: "Software Development Engineer", tag: "Data Structures, Scalability" }, 
            { id: "aws-devops", title: "AWS Cloud Engineer", tag: "AWS, Linux, CI-CD Pipelines" },
            { id: "backend", title: "Backend Engineer", tag: "Java, Spring Boot, Microservices" },
            { id: "data-engineer", title: "Data Engineer", tag: "Redshift, ETL, Big Data" },
            { id: "ml", title: "Applied Scientist", tag: "Machine Learning, NLP, Algorithms" },
            { id: "frontend", title: "Frontend Web Developer", tag: "React, Web Performance" },
            { id: "qa", title: "Quality Assurance Engineer", tag: "Selenium, Automated Testing" },
            { id: "pm", title: "Technical Product Manager", tag: "Roadmap, Technical Strategy" },
            { id: "sys-admin", title: "Systems Engineer", tag: "Scripting, Network Architecture" },
            { id: "security", title: "Security Operations", tag: "Vulnerability Management" }
        ] 
    },
    "adobe": {
        name: "Adobe",
        roles: [
            { id: "sde", title: "Software Development Engineer", tag: "C++, Desktop Applications" },
            { id: "frontend", title: "Frontend Developer", tag: "React, WebAssembly, Canvas API" },
            { id: "backend", title: "Backend Engineer", tag: "Java, Node.js, Cloud Services" },
            { id: "ml", title: "Computer Vision Engineer", tag: "Image Processing, AI Models" },
            { id: "research", title: "Research Scientist", tag: "Generative AI, Deep Learning" },
            { id: "data-analyst", title: "Data Analyst", tag: "Analytics, SQL, Tableau" },
            { id: "cloud", title: "Cloud Reliability Engineer", tag: "AWS, Infrastructure as Code" },
            { id: "pm", title: "Product Manager", tag: "Creative Cloud Strategy, Agile" },
            { id: "sdet", title: "Quality Engineering", tag: "Automation, Framework Design" },
            { id: "design", title: "Product Designer", tag: "UI/UX, Accessibility" }
        ]
    },
    "meta": {
        name: "Meta",
        roles: [
            { id: "swe", title: "Software Engineer", tag: "Algorithms, Distributed Systems" },
            { id: "frontend", title: "Frontend Engineer", tag: "React, GraphQL, UI Architecture" },
            { id: "mobile", title: "Mobile Engineer", tag: "iOS/Android, React Native" },
            { id: "data", title: "Data Engineer", tag: "SQL, Python, Data Pipelines" },
            { id: "ml", title: "Machine Learning Engineer", tag: "PyTorch, AI/ML Infrastructure" },
            { id: "pe", title: "Production Engineer", tag: "Systems, Network, Troubleshooting" },
            { id: "sec", title: "Security Engineer", tag: "Privacy, Threat Intelligence" },
            { id: "arvr", title: "AR/VR Software Engineer", tag: "C++, Graphics, 3D Math" },
            { id: "ds", title: "Data Scientist", tag: "Analytics, A/B Testing" },
            { id: "pm", title: "Product Manager", tag: "User Growth, Feature Strategy" }
        ]
    },
    "netflix": {
        name: "Netflix",
        roles: [
            { id: "backend", title: "Backend Engineer", tag: "Java, Spring, Microservices" },
            { id: "ui", title: "UI Engineer", tag: "React, Node.js, Performance" },
            { id: "data-eng", title: "Data Engineer", tag: "Spark, Kafka, Big Data" },
            { id: "ml", title: "Machine Learning Scientist", tag: "Recommendation Systems" },
            { id: "sre", title: "Core Systems Engineer", tag: "High Availability, Cloud" },
            { id: "mobile", title: "Mobile Developer", tag: "Swift, Kotlin, Video Streaming" },
            { id: "sec", title: "Security Engineer", tag: "Cloud Security, IAM" },
            { id: "qa", title: "Automation Engineer", tag: "Device Testing, Frameworks" },
            { id: "ds", title: "Data Scientist", tag: "Content Analytics, Python" },
            { id: "pm", title: "Product Manager", tag: "Streaming Innovation, UI Strategy" }
        ]
    },
    "apple": {
        name: "Apple",
        roles: [
            { id: "swe", title: "Software Engineer", tag: "Swift, Objective-C, iOS/macOS" },
            { id: "hardware", title: "Hardware Engineer", tag: "Verilog, Circuit Design" },
            { id: "backend", title: "Backend Services Engineer", tag: "Java, Distributed Systems" },
            { id: "ml", title: "AI/ML Engineer", tag: "Siri, CoreML, Computer Vision" },
            { id: "data", title: "Data Engineer", tag: "Spark, Hadoop, Scala" },
            { id: "sre", title: "Site Reliability Engineer", tag: "Infrastructure, Automation" },
            { id: "firmware", title: "Embedded Firmware Engineer", tag: "C/C++, RTOS, Kernel" },
            { id: "qa", title: "Software QA Engineer", tag: "Test Automation, Python" },
            { id: "sec", title: "Security Engineer", tag: "Cryptography, OS Security" },
            { id: "epm", title: "Engineering Project Manager", tag: "Delivery, Hardware/Software Integration" }
        ]
    },
    "oracle": {
        name: "Oracle",
        roles: [
            { id: "backend", title: "Backend Engineer", tag: "Java, Microservices, REST APIs" },
            { id: "db", title: "Database Engineer", tag: "SQL, DBMS Architecture, C++" },
            { id: "cloud", title: "Cloud Infrastructure Engineer", tag: "OCI, Networking, DevOps" },
            { id: "frontend", title: "Frontend Web Developer", tag: "Oracle JET, React, TypeScript" },
            { id: "ml", title: "Machine Learning Engineer", tag: "Data Science, Python, AI" },
            { id: "sec", title: "Security Architect", tag: "Cloud Security, Compliance" },
            { id: "sre", title: "Site Reliability Engineer", tag: "Linux, Automation, Monitoring" },
            { id: "data-eng", title: "Data Engineer", tag: "ETL, Data Warehousing" },
            { id: "qa", title: "Quality Assurance Engineer", tag: "Test Scripts, Automation" },
            { id: "pm", title: "Product Manager", tag: "Enterprise Software Strategy" }
        ]
    },
    "salesforce": {
        name: "Salesforce",
        roles: [
            { id: "swe", title: "Software Engineer", tag: "Apex, Java, Object-Oriented Design" },
            { id: "frontend", title: "Frontend Developer", tag: "Lightning Web Components, JavaScript" },
            { id: "backend", title: "Backend Engineer", tag: "Spring Boot, Distributed Systems" },
            { id: "cloud", title: "Cloud DevOps Engineer", tag: "CI/CD, Kubernetes, AWS" },
            { id: "data", title: "Data Engineer", tag: "Spark, Snowflake, Data Pipelines" },
            { id: "sec", title: "Security Engineer", tag: "Penetration Testing, AppSec" },
            { id: "ml", title: "AI Engineer (Einstein)", tag: "Machine Learning, NLP" },
            { id: "qa", title: "Automation Engineer (SDET)", tag: "Selenium, CI Integration" },
            { id: "sre", title: "Site Reliability Engineer", tag: "Infrastructure, Python, Go" },
            { id: "pm", title: "Product Manager", tag: "CRM Innovation, Agile" }
        ]
    },
    "uber": {
        name: "Uber",
        roles: [
            { id: "backend", title: "Backend Engineer", tag: "Go, Java, Microservices Architecture" },
            { id: "mobile", title: "Mobile Engineer", tag: "iOS (Swift), Android (Kotlin)" },
            { id: "frontend", title: "Frontend Engineer", tag: "React, Web Performance, UI" },
            { id: "data-eng", title: "Data Engineer", tag: "Kafka, Spark, Big Data Systems" },
            { id: "ml", title: "Machine Learning Engineer", tag: "Routing Algorithms, Python" },
            { id: "ds", title: "Data Scientist", tag: "Pricing Models, Analytics" },
            { id: "sre", title: "Site Reliability Engineer", tag: "High Availability, Kubernetes" },
            { id: "sec", title: "Security Engineer", tag: "Application Security, Cloud" },
            { id: "qa", title: "QA Automation Engineer", tag: "End-to-End Testing" },
            { id: "pm", title: "Product Manager", tag: "Mobility Strategy, User Experience" }
        ]
    },
    "paytm": {
        name: "Paytm",
        roles: [
            { id: "backend", title: "Backend Developer", tag: "Node.js, Java, High Scale APIs" },
            { id: "frontend", title: "Frontend Developer", tag: "React.js, Next.js, Redux" },
            { id: "mobile", title: "Mobile App Developer", tag: "React Native, Android/iOS" },
            { id: "devops", title: "DevOps Engineer", tag: "AWS, CI/CD, Docker" },
            { id: "data-eng", title: "Data Engineer", tag: "SQL, Python, Data Warehousing" },
            { id: "sec", title: "Cybersecurity Analyst", tag: "Fintech Security, Compliance" },
            { id: "qa", title: "QA Automation Engineer", tag: "Appium, Selenium" },
            { id: "ml", title: "Machine Learning Engineer", tag: "Fraud Detection Models" },
            { id: "ds", title: "Data Analyst", tag: "Business Intelligence, Tableau" },
            { id: "pm", title: "Product Manager", tag: "Fintech Products, User Journeys" }
        ]
    },
    "flipkart": {
        name: "Flipkart",
        roles: [
            { id: "sde", title: "Software Development Engineer", tag: "Java, Spring, Microservices" },
            { id: "frontend", title: "Frontend Engineer", tag: "React, Progressive Web Apps" },
            { id: "mobile", title: "Mobile Developer", tag: "Android/iOS Architecture" },
            { id: "data", title: "Data Engineer", tag: "Big Data, Hadoop, Spark" },
            { id: "ds", title: "Data Scientist", tag: "Supply Chain Optimization, ML" },
            { id: "devops", title: "DevOps Engineer", tag: "Cloud Infrastructure, Kubernetes" },
            { id: "sec", title: "Security Engineer", tag: "AppSec, Network Security" },
            { id: "sdet", title: "SDET", tag: "Test Automation, QA Frameworks" },
            { id: "analytics", title: "Business Analyst", tag: "E-Commerce Metrics, SQL" },
            { id: "pm", title: "Product Manager", tag: "E-Commerce Strategy, Agile" }
        ]
    },
    "accenture": {
        name: "Accenture",
        roles: [
            { id: "swe", title: "Software Engineering Analyst", tag: "Java, Python, Full Stack" },
            { id: "data", title: "Data Analyst", tag: "SQL, PowerBI, Data Visualization" },
            { id: "cloud", title: "Cloud Engineering Associate", tag: "AWS/Azure/GCP Migration" },
            { id: "cyber", title: "Cybersecurity Analyst", tag: "IAM, Threat Detection" },
            { id: "sap", title: "SAP Consultant", tag: "ERP Systems, ABAP" },
            { id: "salesforce", title: "Salesforce Developer", tag: "Apex, Lightning Components" },
            { id: "qa", title: "Test Automation Engineer", tag: "Selenium, QA Processes" },
            { id: "devops", title: "DevOps Engineer", tag: "Jenkins, CI/CD, Scripting" },
            { id: "ai", title: "AI/ML Developer", tag: "Generative AI, Python" },
            { id: "business", title: "Business Integration Analyst", tag: "Client Solutions, Agile" }
        ]
    },
    "capgemini": {
        name: "Capgemini",
        roles: [
            { id: "sde", title: "Software Engineer", tag: "Java/J2EE, Spring Boot" },
            { id: "frontend", title: "Frontend Developer", tag: "Angular, React, HTML/CSS" },
            { id: "data-eng", title: "Data Engineer", tag: "ETL, SQL, Big Data" },
            { id: "cloud", title: "Cloud Architect", tag: "AWS, Azure Services" },
            { id: "cyber", title: "Cybersecurity Consultant", tag: "Risk Assessment, Compliance" },
            { id: "qa", title: "Automation Test Engineer", tag: "Selenium, Cucumber" },
            { id: "sap", title: "SAP Technical Consultant", tag: "SAP HANA, Implementation" },
            { id: "devops", title: "DevOps Engineer", tag: "Docker, Kubernetes, Ansible" },
            { id: "ds", title: "Data Scientist", tag: "Machine Learning, Analytics" },
            { id: "pm", title: "Scrum Master / PM", tag: "Agile Methodologies, Delivery" }
        ]
    },
    "deloitte": {
        name: "Deloitte",
        roles: [
            { id: "analyst", title: "Technology Analyst", tag: "Software Development, Consulting" },
            { id: "data-analyst", title: "Data Analyst", tag: "SQL, Tableau, Business Insights" },
            { id: "cyber", title: "Cyber Risk Consultant", tag: "InfoSec, Compliance, Auditing" },
            { id: "cloud", title: "Cloud Engineer", tag: "AWS/Azure Solutions Architecture" },
            { id: "salesforce", title: "Salesforce Consultant", tag: "CRM Integration, Apex" },
            { id: "sap", title: "SAP Consultant", tag: "ERP Implementation" },
            { id: "fullstack", title: "Full Stack Developer", tag: "MERN/MEAN Stack" },
            { id: "devops", title: "DevOps Consultant", tag: "CI/CD, Infrastructure" },
            { id: "ai", title: "AI Strategy Consultant", tag: "Generative AI, Analytics" },
            { id: "qa", title: "Quality Engineering Analyst", tag: "Testing Lifecycle, Automation" }
        ]
    },
    "cognizant": {
        name: "Cognizant",
        roles: [
            { id: "pat", title: "Programmer Analyst Trainee", tag: "Java, C++, Core CS" },
            { id: "fullstack", title: "Full Stack Engineer", tag: "React, Node.js, Spring Boot" },
            { id: "data", title: "Data & Analytics Engineer", tag: "SQL, Python, ETL" },
            { id: "cloud", title: "Cloud Developer", tag: "AWS, Azure, Microservices" },
            { id: "qa", title: "Quality Assurance Engineer", tag: "Automation, Manual Testing" },
            { id: "cyber", title: "Security Analyst", tag: "Network Security, IAM" },
            { id: "salesforce", title: "Salesforce Developer", tag: "CRM Development" },
            { id: "devops", title: "DevOps Engineer", tag: "Jenkins, Git, Docker" },
            { id: "ds", title: "AI & Data Scientist", tag: "Machine Learning, R, Python" },
            { id: "ba", title: "Business Analyst", tag: "Requirements Gathering, Agile" }
        ]
    },
    "infosys": {
        name: "Infosys",
        roles: [
            { id: "se", title: "Systems Engineer", tag: "Java, Python, Mainframe" },
            { id: "ses", title: "Specialist Programmer", tag: "Advanced DSA, Full Stack" },
            { id: "data", title: "Data Engineer", tag: "Hadoop, Spark, SQL" },
            { id: "cloud", title: "Cloud Developer", tag: "Azure, AWS, Migration" },
            { id: "ui", title: "UI/UX Developer", tag: "Angular, React, Web Design" },
            { id: "qa", title: "Test Automation Engineer", tag: "Selenium, API Testing" },
            { id: "cyber", title: "Cybersecurity Analyst", tag: "Vulnerability Assessment" },
            { id: "sap", title: "SAP Consultant", tag: "ERP, Integration" },
            { id: "devops", title: "DevOps Engineer", tag: "CI/CD Pipelines, Scripting" },
            { id: "pm", title: "Project Manager", tag: "IT Service Delivery" }
        ]
    },
    "wipro": {
        name: "Wipro",
        roles: [
            { id: "pe", title: "Project Engineer", tag: "Java, C++, Core Concepts" },
            { id: "turbo", title: "Turbo Engineer", tag: "Advanced Coding, Full Stack" },
            { id: "cloud", title: "Cloud Infrastructure Engineer", tag: "AWS, Azure, Virtualization" },
            { id: "data", title: "Data Analyst / Engineer", tag: "SQL, Python, Data Pipelines" },
            { id: "cyber", title: "Security Analyst", tag: "SOC, Penetration Testing" },
            { id: "qa", title: "Test Engineer", tag: "Automation Testing, Quality Assurance" },
            { id: "ui", title: "Frontend Developer", tag: "HTML, CSS, JavaScript, React" },
            { id: "devops", title: "DevOps Engineer", tag: "Continuous Integration, Docker" },
            { id: "sap", title: "SAP Technical Consultant", tag: "Enterprise Solutions" },
            { id: "ba", title: "Business Analyst", tag: "Client Requirements, Documentation" }
        ]
    },
    "hcl technologies": {
        name: "HCL Technologies",
        roles: [
            { id: "get", title: "Graduate Engineer Trainee", tag: "Core Aptitude, OOPS & Java/C++" },
            { id: "swe", title: "Software Engineer", tag: "Full Stack Web Development, SQL" },
            { id: "infra", title: "Infrastructure Analyst", tag: "Cloud Operations, Linux & Networking" },
            { id: "data", title: "Data Engineer", tag: "Database Management, Python, ETL" },
            { id: "cyber", title: "Cybersecurity Analyst", tag: "Threat Analysis, Network Security" },
            { id: "cloud", title: "Cloud Engineer", tag: "AWS/Azure Deployment" },
            { id: "qa", title: "Automation Test Engineer", tag: "Selenium, Appium, API Testing" },
            { id: "vlsi", title: "VLSI / Embedded Engineer", tag: "C, C++, Microcontrollers" },
            { id: "devops", title: "DevOps Engineer", tag: "CI/CD, Kubernetes, Scripting" },
            { id: "support", title: "IT Support Engineer", tag: "Troubleshooting, System Admin" }
        ]
    },
    "tata consultancy services tcs": {
        name: "TCS",
        roles: [
            { id: "ninja", title: "TCS Ninja", tag: "Aptitude, Basic Coding, Core CS" },
            { id: "digital", title: "TCS Digital", tag: "Advanced Coding, DSA, Full Stack" },
            { id: "prime", title: "TCS Prime", tag: "System Design, Complex Algorithms" },
            { id: "data", title: "Data Engineer", tag: "Big Data, SQL, Data Warehousing" },
            { id: "cloud", title: "Cloud Specialist", tag: "Azure, AWS, Architecture" },
            { id: "cyber", title: "Cybersecurity Specialist", tag: "Information Security, IAM" },
            { id: "qa", title: "Quality Assurance Analyst", tag: "Automation Frameworks" },
            { id: "ui", title: "Frontend Developer", tag: "Angular, React, User Interfaces" },
            { id: "devops", title: "DevOps Engineer", tag: "Infrastructure as Code, Jenkins" },
            { id: "iot", title: "IoT Developer", tag: "Embedded Systems, Edge Computing" }
        ]
    },
    "goldman sachs": {
        name: "Goldman Sachs",
        roles: [
            { id: "swe", title: "Software Engineer", tag: "Java, C++, Low Latency Systems" },
            { id: "data", title: "Data Engineer", tag: "Spark, Distributed Data, SQL" },
            { id: "quant", title: "Quantitative Strategist", tag: "Math, Python, Algorithmic Trading" },
            { id: "frontend", title: "Frontend Engineer", tag: "React, TypeScript, Financial Dashboards" },
            { id: "cloud", title: "Cloud Engineer", tag: "AWS, Kubernetes, Secure Infrastructure" },
            { id: "sec", title: "Cybersecurity Engineer", tag: "Cryptography, Threat Defense" },
            { id: "sre", title: "Site Reliability Engineer", tag: "Systems Uptime, Python Scripting" },
            { id: "ml", title: "Machine Learning Engineer", tag: "Predictive Models, Risk Analysis" },
            { id: "qa", title: "SDET", tag: "Automated Financial System Testing" },
            { id: "pm", title: "Technical Product Manager", tag: "Trading Platforms Strategy" }
        ]
    },
    "morgan stanley": {
        name: "Morgan Stanley",
        roles: [
            { id: "swe", title: "Technology Analyst (SWE)", tag: "Java, C#, High-Performance Computing" },
            { id: "data", title: "Data Analyst / Engineer", tag: "SQL, ETL, Financial Reporting" },
            { id: "quant", title: "Quantitative Developer", tag: "C++, Python, Mathematical Modeling" },
            { id: "cloud", title: "Cloud & Infrastructure Engineer", tag: "Azure, Network Architecture" },
            { id: "frontend", title: "UI/UX Developer", tag: "Angular, Web Technologies" },
            { id: "sec", title: "Information Security Analyst", tag: "Risk Management, AppSec" },
            { id: "devops", title: "DevOps Engineer", tag: "CI/CD, Automation, Docker" },
            { id: "ml", title: "AI/ML Researcher", tag: "NLP, Financial Algorithms" },
            { id: "sre", title: "SRE", tag: "Linux, Production Engineering" },
            { id: "ba", title: "Business Analyst", tag: "Trading Systems Requirements" }
        ]
    }
};

app.get("/position/:companyName", isloggedin, (req, res) => {
    const requestedCompany = req.params.companyName.toLowerCase();
    let selectedCompany = companyPositionsDB[requestedCompany];

    if (!selectedCompany) {
        const formattedName = requestedCompany.charAt(0).toUpperCase() + requestedCompany.slice(1);
        selectedCompany = {
            name: formattedName,
            roles: [
                { id: "sde", title: "Software Development Engineer", tag: "Core DSA, System Design" },
                { id: "frontend", title: "Frontend Engineer", tag: "React, JavaScript, UI Systems" },
                { id: "backend", title: "Backend Engineer", tag: "Node.js, Microservices, APIs" },
                { id: "fullstack", title: "Full Stack Developer", tag: "MERN/MEAN Stack" },
                { id: "data-scientist", title: "Data Scientist", tag: "Machine Learning, Python" },
                { id: "data-analyst", title: "Data Analyst", tag: "SQL, Tableau, Excel" },
                { id: "cloud-devops", title: "Cloud & DevOps Engineer", tag: "AWS/Azure, Docker, CI/CD" },
                { id: "sdet", title: "QA Automation Engineer (SDET)", tag: "Testing Frameworks" },
                { id: "cybersecurity", title: "Cybersecurity Analyst", tag: "Network Security, Risk" },
                { id: "product-manager", title: "Product Manager", tag: "Agile, Strategy" }
            ]
        };
    }

    res.render("position", {
        company: selectedCompany
    });
});
app.post("/generate-roadmap", isloggedin, async (req, res) => {
    try {
        const { companyName, roleTitle, skillLevel, timeCommitment } = req.body;

        if (!companyName || !roleTitle || !skillLevel || !timeCommitment) {
            return res.status(400).send("Missing required roadmap configuration parameters.");
        }

        const targetGoal = `${companyName} ${roleTitle}`;

        const chatCompletion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            messages: [
                {
                    role: "system",
                    content: "You are a professional technical career coach. Output ONLY a valid JSON object matching the requested schema. Do not include markdown formatting like ```json or any conversational text. Just the raw JSON object."
                },
                {
                    role: "user",
                    content: `
Generate a highly structured, 4-phase technical preparation roadmap.
Target Career Goal: "${targetGoal}"
Current Experience Level: "${skillLevel}"
Weekly Available Time Context: "${timeCommitment}"

Rules:
- Generate exactly 4 sequential phases.
- Tailor the pacing to the Weekly Available Time.
- Tailor the starting difficulty to the Current Experience Level.

Return the data STRICTLY in this JSON format:
{
  "title": "${targetGoal} Preparation Roadmap",
  "phases": [
    {
      "phaseNumber": 1,
      "phaseTitle": "Phase Name Here",
      "duration": "e.g., Weeks 1-4",
      "description": "Short summary of what to master in this phase.",
      "milestones": [
        "Actionable technical milestone 1",
        "Actionable technical milestone 2",
        "Actionable technical milestone 3"
      ]
    }
  ]
}
`
                }
            ],
            response_format: { type: "json_object" } 
        });

        let content = chatCompletion.choices[0].message.content;
        
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();

        const roadmapData = JSON.parse(content);

        res.render("roadmap", {
            roadmap: roadmapData
        });

    } catch (error) {
        console.error("Groq AI Generation Error:", error);
        res.status(500).send("Failed to generate your personalized roadmap. Please try again.");
    }
});
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});