---
name: homework-submit
description: Automate homework submission by creating a branch, committing changes, and opening a PR with the template. Use when the user is ready to submit their homework assignment.
argument-hint: homework number (e.g., 1, 2, 3)
---

# Homework Submission Automation

Automate the complete homework submission workflow including branch creation, committing changes, and opening a pull request.

## Workflow Steps

When the user invokes this skill with a homework number (e.g., "submit homework 3"), execute the following steps:

### 1. Parse the Homework Number

Extract the homework number from the user's request. This will be used throughout the workflow.

**Example inputs:**
- "submit homework 3" → homework number: 3
- "submit homework 1" → homework number: 1
- Just "3" or "homework 4" → homework number: 3 or 4

### 2. Create and Switch to Submission Branch

Create a new branch following the naming convention:
```bash
git checkout -b homework-{N}-submission
```

Where `{N}` is the homework number.

**Example:** For homework 3: `git checkout -b homework-3-submission`

### 3. Stage All Changes

Add all changes in the working directory:
```bash
git add .
```

### 4. Commit with Standard Message

Commit the changes with the standardized message:
```bash
git commit -m "Complete homework {N}"
```

**Example:** For homework 3: `git commit -m "Complete homework 3"`

### 5. Push to Remote

Push the branch to the remote repository:
```bash
git push origin homework-{N}-submission
```

### 6. Create Pull Request

Use GitHub CLI or provide instructions to create a PR with:
- **Title:** `Complete homework {N}`
- **Base branch:** `main`
- **Head branch:** `homework-{N}-submission`
- **Template:** The PR will automatically use the `.github/pull_request_template.md`

**Using GitHub CLI (if available):**
```bash
gh pr create --title "Complete homework {N}" --body "" --base main --head homework-{N}-submission
```

**If GitHub CLI is not available:**
Provide the user with a direct link to create the PR:
```
https://github.com/{username}/{repo}/compare/main...homework-{N}-submission?expand=1
```

And remind them to:
- Fill in the PR template with their summary, AI tools used, challenges, and screenshots
- Assign the instructor as a reviewer

## Error Handling

### If there are no changes to commit:
- Inform the user that there are no changes in the working directory
- Ask if they want to proceed anyway or cancel

### If the branch already exists:
- Check if the user wants to:
  - Switch to the existing branch and add more commits
  - Delete the old branch and create a new one
  - Use a different branch name

### If git push fails:
- Check if there are conflicts or authentication issues
- Provide guidance on how to resolve

## Confirmation Messages

After successful execution, provide a summary:
```
✅ Homework {N} submission completed!

📋 Summary:
- Branch created: homework-{N}-submission
- Commit: "Complete homework {N}"
- Changes pushed to origin

🔗 Next steps:
- Open PR at: [link]
- Fill in the PR template
- Assign instructor for review
```

## Pre-flight Checks

Before executing the workflow, verify:
1. User is in a git repository
2. There are changes to commit (or confirm user wants to proceed)
3. User has git configured (name and email)
4. Remote repository is accessible

## Example Usage

**User:** "Submit homework 3"

**Assistant actions:**
1. Check current git status
2. Create branch `homework-3-submission`
3. Add all changes
4. Commit with message "Complete homework 3"
5. Push to origin
6. Create PR or provide link
7. Confirm completion with summary

## Notes

- Always use the exact format for branch names and commit messages to maintain consistency
- The PR template will automatically populate when the PR is created
- Remind users to fill in the template sections before requesting review
- If the user has uncommitted changes, stage them all unless they specify otherwise
