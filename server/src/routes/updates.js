import { Router } from 'express';
import { execSync, exec, spawn } from 'child_process';
import { promisify } from 'util';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, writeFileSync, readFileSync } from 'fs';

const execAsync = promisify(exec);
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../');
const clientRoot = join(projectRoot, 'client');
const serverRoot = join(projectRoot, 'server');

const GITHUB_REPO = 'yuwenchat/2026-Rev';
const GITHUB_API = 'https://api.github.com';

// Update status tracking
let updateStatus = {
  inProgress: false,
  stage: null,
  message: '',
  error: null,
  startTime: null
};

// All routes require admin
router.use(authMiddleware, adminMiddleware);

// Get current git status
router.get('/status', async (req, res) => {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectRoot }).toString().trim();
    const currentCommit = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
    const currentCommitShort = currentCommit.substring(0, 7);
    const commitDate = execSync('git log -1 --format=%ci', { cwd: projectRoot }).toString().trim();
    const commitMessage = execSync('git log -1 --format=%s', { cwd: projectRoot }).toString().trim();

    // Check for local changes
    const statusOutput = execSync('git status --porcelain', { cwd: projectRoot }).toString().trim();
    const hasLocalChanges = statusOutput.length > 0;

    res.json({
      currentBranch,
      currentCommit,
      currentCommitShort,
      commitDate,
      commitMessage,
      hasLocalChanges,
      localChanges: hasLocalChanges ? statusOutput.split('\n').length : 0
    });
  } catch (err) {
    console.error('Get git status error:', err);
    res.status(500).json({ error: 'Failed to get git status' });
  }
});

// Get available branches from GitHub
router.get('/branches', async (req, res) => {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/branches`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'YuwenChat-Updater'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const branches = await response.json();

    // Get more details for each branch
    const branchDetails = await Promise.all(branches.map(async (branch) => {
      try {
        const commitResponse = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/commits/${branch.commit.sha}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'YuwenChat-Updater'
          }
        });

        if (commitResponse.ok) {
          const commitData = await commitResponse.json();
          return {
            name: branch.name,
            sha: branch.commit.sha,
            shortSha: branch.commit.sha.substring(0, 7),
            message: commitData.commit.message.split('\n')[0],
            date: commitData.commit.committer.date,
            author: commitData.commit.author.name
          };
        }
      } catch {
        // Ignore errors for individual branches
      }

      return {
        name: branch.name,
        sha: branch.commit.sha,
        shortSha: branch.commit.sha.substring(0, 7)
      };
    }));

    res.json(branchDetails);
  } catch (err) {
    console.error('Get branches error:', err);
    res.status(500).json({ error: 'Failed to fetch branches from GitHub' });
  }
});

// Check for updates on a specific branch
router.get('/check/:branch', async (req, res) => {
  try {
    const { branch } = req.params;

    // Fetch latest from remote
    execSync(`git fetch origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' });

    // Get current HEAD
    const localHead = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

    // Get remote HEAD for the branch
    let remoteHead;
    try {
      remoteHead = execSync(`git rev-parse origin/${branch}`, { cwd: projectRoot }).toString().trim();
    } catch {
      return res.status(404).json({ error: `Branch '${branch}' not found on remote` });
    }

    // Check if there are differences
    const hasUpdates = localHead !== remoteHead;

    let commits = [];
    let filesChanged = [];

    if (hasUpdates) {
      // Get list of commits between local and remote
      try {
        const commitLog = execSync(
          `git log HEAD..origin/${branch} --oneline --format="%h|%s|%an|%ci"`,
          { cwd: projectRoot }
        ).toString().trim();

        if (commitLog) {
          commits = commitLog.split('\n').map(line => {
            const [hash, message, author, date] = line.split('|');
            return { hash, message, author, date };
          });
        }
      } catch {
        // No commits to show
      }

      // Get list of files that will be changed
      try {
        const diffOutput = execSync(
          `git diff --name-status HEAD..origin/${branch}`,
          { cwd: projectRoot }
        ).toString().trim();

        if (diffOutput) {
          filesChanged = diffOutput.split('\n').map(line => {
            const [status, ...pathParts] = line.split('\t');
            return {
              status: status === 'A' ? 'added' : status === 'D' ? 'deleted' : 'modified',
              path: pathParts.join('\t')
            };
          });
        }
      } catch {
        // No files changed
      }
    }

    res.json({
      branch,
      localHead: localHead.substring(0, 7),
      remoteHead: remoteHead.substring(0, 7),
      hasUpdates,
      commits,
      filesChanged,
      // Check if database files are affected
      databaseSafe: !filesChanged.some(f => f.path.includes('data/') || f.path.endsWith('.db'))
    });
  } catch (err) {
    console.error('Check updates error:', err);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

// Get current update progress
router.get('/progress', (req, res) => {
  res.json(updateStatus);
});

// Helper function to check if pm2 is available
function isPm2Available() {
  try {
    execSync('which pm2', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Helper function to get pm2 process name
function getPm2ProcessName() {
  try {
    const pm2List = execSync('pm2 jlist', { stdio: 'pipe' }).toString();
    const processes = JSON.parse(pm2List);
    // Find our server process
    const serverProcess = processes.find(p =>
      p.pm2_env?.pm_cwd?.includes('2026-Rev') ||
      p.name?.includes('yuwen') ||
      p.pm2_env?.script?.includes('server')
    );
    return serverProcess?.name || null;
  } catch {
    return null;
  }
}

// Apply updates from a specific branch with auto-build and restart
router.post('/apply/:branch', async (req, res) => {
  try {
    const { branch } = req.params;
    const { stashLocal, autoBuild = true, autoRestart = true } = req.body;

    // Check if update is already in progress
    if (updateStatus.inProgress) {
      return res.status(409).json({
        error: 'Update already in progress',
        stage: updateStatus.stage,
        message: updateStatus.message
      });
    }

    // Start update process
    updateStatus = {
      inProgress: true,
      stage: 'checking',
      message: 'Checking local changes...',
      error: null,
      startTime: Date.now()
    };

    // Check for local changes
    const statusOutput = execSync('git status --porcelain', { cwd: projectRoot }).toString().trim();
    const hasLocalChanges = statusOutput.length > 0;

    if (hasLocalChanges) {
      if (stashLocal) {
        updateStatus.stage = 'stashing';
        updateStatus.message = 'Stashing local changes...';
        execSync('git stash push -m "Auto-stash before update"', { cwd: projectRoot });
      } else {
        updateStatus = { ...updateStatus, inProgress: false, error: 'Local changes detected' };
        return res.status(400).json({
          error: 'Local changes detected',
          hasLocalChanges: true,
          message: 'Please stash or commit local changes first'
        });
      }
    }

    // Fetch latest
    updateStatus.stage = 'fetching';
    updateStatus.message = 'Fetching latest code from GitHub...';
    execSync(`git fetch origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' });

    // Get current commit before update
    const beforeCommit = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

    // Merge updates
    updateStatus.stage = 'merging';
    updateStatus.message = 'Merging updates...';
    try {
      execSync(`git merge origin/${branch} --no-edit`, { cwd: projectRoot, stdio: 'pipe' });
    } catch (mergeError) {
      try {
        execSync('git merge --abort', { cwd: projectRoot });
      } catch { /* ignore */ }

      if (hasLocalChanges && stashLocal) {
        try { execSync('git stash pop', { cwd: projectRoot }); } catch { /* ignore */ }
      }

      updateStatus = { ...updateStatus, inProgress: false, error: 'Merge conflict' };
      return res.status(500).json({
        error: 'Merge conflict',
        message: 'Could not merge updates automatically. Manual intervention required.'
      });
    }

    const afterCommit = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();
    const updated = beforeCommit !== afterCommit;

    // Check which files changed to determine what needs rebuilding
    let clientChanged = false;
    let serverChanged = false;
    if (updated) {
      try {
        const changedFiles = execSync(`git diff --name-only ${beforeCommit}..${afterCommit}`, { cwd: projectRoot }).toString();
        clientChanged = changedFiles.includes('client/');
        serverChanged = changedFiles.includes('server/');
      } catch { /* ignore */ }
    }

    // Restore stashed changes
    let stashRestored = false;
    if (hasLocalChanges && stashLocal) {
      try {
        execSync('git stash pop', { cwd: projectRoot });
        stashRestored = true;
      } catch { stashRestored = false; }
    }

    // Auto-build client if changed and autoBuild is enabled
    let buildSuccess = true;
    let buildOutput = '';
    if (autoBuild && clientChanged) {
      updateStatus.stage = 'installing';
      updateStatus.message = 'Installing client dependencies...';
      try {
        execSync('npm install', { cwd: clientRoot, stdio: 'pipe', timeout: 120000 });

        updateStatus.stage = 'building';
        updateStatus.message = 'Building client...';
        const result = execSync('npm run build', { cwd: clientRoot, stdio: 'pipe', timeout: 180000 });
        buildOutput = result.toString();
      } catch (buildErr) {
        buildSuccess = false;
        buildOutput = buildErr.message;
      }
    }

    // Install server dependencies if server changed
    if (autoBuild && serverChanged) {
      updateStatus.stage = 'server-deps';
      updateStatus.message = 'Installing server dependencies...';
      try {
        execSync('npm install', { cwd: serverRoot, stdio: 'pipe', timeout: 120000 });
      } catch { /* ignore */ }
    }

    // Send response before restart
    const response = {
      success: true,
      beforeCommit: beforeCommit.substring(0, 7),
      afterCommit: afterCommit.substring(0, 7),
      updated,
      stashRestored,
      clientChanged,
      serverChanged,
      buildSuccess,
      buildOutput: buildSuccess ? '' : buildOutput,
      willRestart: autoRestart && updated,
      message: updated
        ? (autoRestart ? 'Update applied. Server restarting...' : 'Update applied successfully.')
        : 'Already up to date.'
    };

    res.json(response);

    // Auto-restart if enabled and changes were made
    if (autoRestart && updated) {
      updateStatus.stage = 'restarting';
      updateStatus.message = 'Restarting server...';

      // Give time for response to be sent
      setTimeout(() => {
        const pm2Name = getPm2ProcessName();
        if (pm2Name) {
          // Restart via pm2
          try {
            exec(`pm2 restart ${pm2Name}`, (err) => {
              if (err) console.error('PM2 restart error:', err);
            });
          } catch (e) {
            console.error('PM2 restart failed:', e);
          }
        } else if (isPm2Available()) {
          // Try to restart the server process
          try {
            exec('pm2 restart all', (err) => {
              if (err) console.error('PM2 restart all error:', err);
            });
          } catch (e) {
            console.error('PM2 restart all failed:', e);
          }
        } else {
          // No pm2, use process exit to trigger restart (if running under supervisor)
          console.log('No PM2 found, exiting process for supervisor restart...');
          process.exit(0);
        }
      }, 500);
    } else {
      updateStatus = { inProgress: false, stage: null, message: '', error: null, startTime: null };
    }

  } catch (err) {
    console.error('Apply updates error:', err);
    updateStatus = { inProgress: false, stage: null, message: '', error: err.message, startTime: null };
    res.status(500).json({ error: 'Failed to apply updates: ' + err.message });
  }
});

// Get update history (recent git log)
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const logOutput = execSync(
      `git log -${limit} --oneline --format="%h|%s|%an|%ci"`,
      { cwd: projectRoot }
    ).toString().trim();

    const commits = logOutput.split('\n').map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });

    res.json(commits);
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: 'Failed to get update history' });
  }
});

export default router;
