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

async function executeGitCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return stdout || stderr || 'Command executed successfully';
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }


  async function generateCommitMessage(): Promise<string> {
    try {
      const { stdout: status } = await execAsync('git status --porcelain');
      const { stdout: diff } = await execAsync('git diff --cached --stat');
      
      if (!status.trim()) {
        return 'No changes to commit';
      }
  
      const prompt = `Generate a concise git commit message for these changes:
      
  Status: ${status}
  Diff stats: ${diff}
  
  Rules:
  - Keep it under 50 characters for the title
  - Use conventional commit format (feat:, fix:, docs:, etc.)
  - Be descriptive but brief
  - Only return the commit message, nothing else`;
  
      const result = await model.generateContent(prompt);
      const message = result.response.text().trim().replace(/"/g, '');
      
      return message || 'Update files';
    } catch (error) {
      return 'Update files';
    }
  }
  async function pushToGitHub(): Promise<void> {
    console.log(' Starting GitHub Push Agent...\n');
  
    try {
     
      console.log(' Checking if this is a git repository...');
      const gitCheck = await executeGitCommand('git status');
      if (gitCheck.includes('Error')) {
        console.log(' Not a git repository. Please run "git init" first.');
        return;
      }
  
      
      console.log(' Checking for changes...');
      const status = await executeGitCommand('git status --porcelain');
      
      if (!status.trim()) {
        console.log(' No changes to commit. Repository is up to date!');
        return;
      }
  
      console.log(' Changes found:');
      console.log(status);
  
     
      console.log('\n Staging all changes...');
      const addResult = await executeGitCommand('git add .');
      if (addResult.includes('Error')) {
        console.log(' Failed to stage changes:', addResult);
        return;
      }
      console.log(' Changes staged successfully!');
  
      
      console.log(' Generating commit message with AI...');
      const commitMessage = await generateCommitMessage();
      console.log(` Generated message: "${commitMessage}"`);
  
     
      console.log('\n Committing changes...');
      const commitResult = await executeGitCommand(`git commit -m "${commitMessage}"`);
      if (commitResult.includes('Error')) {
        console.log(' Failed to commit:', commitResult);
        return;
      }
      console.log(' Committed successfully!');

     
      console.log(' Pushing to GitHub...');
      const pushResult = await executeGitCommand('git push');
      
      if (pushResult.includes('Error')) {
      
        const branchResult = await executeGitCommand('git branch --show-current');
        const branch = branchResult.trim();
        
        if (branch) {
          console.log(` Trying to push to origin/${branch}...`);
          const retryPush = await executeGitCommand(`git push -u origin ${branch}`);
          
          if (retryPush.includes('Error')) {
            console.log(' Push failed:', retryPush);
            console.log('\n Make sure you have:');
            console.log('   - Set up a GitHub remote: git remote add origin <url>');
            console.log('   - Proper GitHub authentication');
            return;
          }
        } else {
          console.log(' Push failed:', pushResult);
          return;
        }
      }
  
      console.log('🎉 Successfully pushed to GitHub!');
      console.log('\nSummary:');
      console.log(`   • Commit: ${commitMessage}`);
      console.log(`   • Files changed: ${status.split('\n').filter(line => line.trim()).length}`);
      console.log('   • Status: Pushed to remote repository');
  
    } catch (error: any) {
      console.log(' Unexpected error:', error.message);
    }
  }

  async function main() {
    try {
      await pushToGitHub();
    } catch (error: any) {
      console.log('Setup error:', error.message);
      console.log('\n  Make sure to:');
      console.log('   1. Create a .env file with GEMINI_API_KEY');
      console.log('   2. Run npm install');
      console.log('   3. Make sure you\'re in a git repository');
    }
  }
  
  main();