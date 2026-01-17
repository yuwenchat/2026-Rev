import { Router } from 'express';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../');

const GITHUB_REPO = 'yuwenchat/2026-Rev';
const GITHUB_API = 'https://api.github.com';

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

// Apply updates from a specific branch
router.post('/apply/:branch', async (req, res) => {
  try {
    const { branch } = req.params;
    const { stashLocal } = req.body; // Whether to stash local changes

    // Check for local changes
    const statusOutput = execSync('git status --porcelain', { cwd: projectRoot }).toString().trim();
    const hasLocalChanges = statusOutput.length > 0;

    if (hasLocalChanges) {
      if (stashLocal) {
        // Stash local changes
        execSync('git stash push -m "Auto-stash before update"', { cwd: projectRoot });
      } else {
        return res.status(400).json({
          error: 'Local changes detected',
          hasLocalChanges: true,
          message: 'Please stash or commit local changes first'
        });
      }
    }

    // Fetch latest
    execSync(`git fetch origin ${branch}`, { cwd: projectRoot, stdio: 'pipe' });

    // Get current commit before update
    const beforeCommit = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

    // Reset to the remote branch (hard reset, but we've stashed changes if needed)
    // Using merge instead of reset to be safer
    try {
      execSync(`git merge origin/${branch} --no-edit`, { cwd: projectRoot, stdio: 'pipe' });
    } catch (mergeError) {
      // If merge fails, abort it
      try {
        execSync('git merge --abort', { cwd: projectRoot });
      } catch {
        // Ignore abort errors
      }

      // Restore stashed changes if we stashed them
      if (hasLocalChanges && stashLocal) {
        try {
          execSync('git stash pop', { cwd: projectRoot });
        } catch {
          // Stash pop might fail if there are conflicts
        }
      }

      return res.status(500).json({
        error: 'Merge conflict',
        message: 'Could not merge updates automatically. Manual intervention required.'
      });
    }

    // Get new commit after update
    const afterCommit = execSync('git rev-parse HEAD', { cwd: projectRoot }).toString().trim();

    // Restore stashed changes if we stashed them
    let stashRestored = false;
    if (hasLocalChanges && stashLocal) {
      try {
        execSync('git stash pop', { cwd: projectRoot });
        stashRestored = true;
      } catch {
        // Stash pop failed, changes are still in stash
        stashRestored = false;
      }
    }

    res.json({
      success: true,
      beforeCommit: beforeCommit.substring(0, 7),
      afterCommit: afterCommit.substring(0, 7),
      updated: beforeCommit !== afterCommit,
      stashRestored,
      message: beforeCommit !== afterCommit
        ? 'Update applied successfully. Please restart the server to apply changes.'
        : 'Already up to date.'
    });
  } catch (err) {
    console.error('Apply updates error:', err);
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
