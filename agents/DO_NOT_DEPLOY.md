# ⚠️ DO NOT DEPLOY - DEVELOPMENT AGENTS ONLY

**CRITICAL WARNING:** The files in this directory are development and monitoring agents that should **NEVER** be deployed to Vercel or any production environment.

## Why These Files Must Be Excluded

### Security Risks
- Contains sensitive API tokens and configurations
- Includes server-side monitoring code not meant for browser execution
- May expose internal system information

### Deployment Issues  
- Python dependencies not available in Vercel's Node.js environment
- Large file sizes that would bloat the deployment bundle
- Incompatible runtime requirements

### Performance Impact
- Unnecessary files would increase build times
- Would add megabytes to deployment size
- Could cause memory issues in serverless functions

## Verification

The `.vercelignore` file includes these exclusions:
- `agents/` - This entire directory
- `*.py` - All Python files
- `*.yaml` - Configuration files
- `requirements.txt` - Python dependencies
- `*_SETUP.md` - Setup documentation

## If You See This File in a Deployment

**This indicates a critical configuration error!**

1. Check your `.vercelignore` file includes the `agents/` directory
2. Verify the exclusion patterns are working correctly
3. Contact the development team immediately

---

**Remember:** These agents run separately on development machines or dedicated servers, NOT in the Vercel deployment.