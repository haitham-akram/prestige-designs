# ✅ R2 Setup Checklist

Use this checklist to track your progress through the R2 implementation.

## Phase 1: Cloudflare Account Setup (30 minutes)

- [ ] Visit https://www.cloudflare.com
- [ ] Click "Sign Up"
- [ ] Enter email address
- [ ] Create password
- [ ] Verify email (check inbox)
- [ ] Complete account setup
- [ ] Set up 2FA (recommended)
- [ ] Navigate to R2 section
- [ ] Create new bucket
- [ ] Name bucket: `prestige-designs-files` (exact name)
- [ ] Select region: Automatic (Geo-Redundant)
- [ ] Click Create
- [ ] Note your Account ID (visible at top of dashboard)

## Phase 2: API Credential Generation (10 minutes)

- [ ] Go to Account Home → https://dash.cloudflare.com
- [ ] Navigate to R2 section
- [ ] Click "API Tokens" in settings
- [ ] Click "Create API token"
- [ ] Choose "Edit (Full)" template
- [ ] Token Name: `prestige-designs-api`
- [ ] Permissions: ✓ Account > R2 > Edit
- [ ] TTL: Never (or your preference)
- [ ] Applicable Buckets: `prestige-designs-files`
- [ ] Create Token
- [ ] Copy Access Key ID (save to temporary location)
- [ ] Copy Secret Access Key (save to temporary location)

## Phase 3: Environment Configuration (5 minutes)

- [ ] Open `.env.local` in project root
- [ ] Add this line: `CLOUDFLARE_R2_ACCESS_KEY_ID=`
- [ ] Paste your Access Key ID after the `=`
- [ ] Add this line: `CLOUDFLARE_R2_SECRET_ACCESS_KEY=`
- [ ] Paste your Secret Access Key after the `=`
- [ ] Add this line: `CLOUDFLARE_R2_ACCOUNT_ID=`
- [ ] Paste your Account ID after the `=`
- [ ] Add this line: `CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files`
- [ ] Save `.env.local` file
- [ ] Verify all 4 variables are set correctly

**Example:**

```
CLOUDFLARE_R2_ACCESS_KEY_ID=abc123def456ghi789
CLOUDFLARE_R2_SECRET_ACCESS_KEY=XyZ1a2B3c4D5e6F7g8H9i0j
CLOUDFLARE_R2_ACCOUNT_ID=f1a2b3c4d5e6f7g8h9i0j
CLOUDFLARE_R2_BUCKET_NAME=prestige-designs-files
```

## Phase 4: Connection Testing (10 minutes)

- [ ] Stop dev server if running (Ctrl+C)
- [ ] Clear npm cache: `npm cache clean --force`
- [ ] Restart dev server: `npm run dev`
- [ ] Wait for "compiled successfully" message
- [ ] Open browser to: `http://localhost:3000/api/r2/test`
- [ ] Should see: `"success": true`
- [ ] Should see bucket name: `"prestige-designs-files"`
- [ ] Should see quota: `"Unlimited (Pay-as-you-go)"`

**If you get an error:**

- [ ] Double-check all 4 environment variables
- [ ] Verify exact spelling (case-sensitive)
- [ ] Check for extra spaces in values
- [ ] Verify bucket exists in R2 dashboard
- [ ] Try restarting dev server again
- [ ] Check browser console for specific error

## Phase 5: Upload & Download Testing (15 minutes)

**Upload Test:**

- [ ] Go to admin panel
- [ ] Navigate to product upload section
- [ ] Select a design file (any .psd, .jpg, .pdf, etc.)
- [ ] Upload it
- [ ] Check for success message
- [ ] Go to R2 dashboard
- [ ] Open `prestige-designs-files` bucket
- [ ] Should see file in `designs/` folder
- [ ] Verify file size matches original

**Download Test:**

- [ ] Log in as customer
- [ ] Find a product with the design you just uploaded
- [ ] Click "Download Design File"
- [ ] File should download
- [ ] Verify file content is correct
- [ ] Check file size matches

**Database Check:**

- [ ] Open MongoDB/database viewer
- [ ] Find the design file document
- [ ] Should have `useR2: true`
- [ ] Should have `r2FileKey: "designs/..."`
- [ ] Should have `r2FolderPath: "designs/..."`
- [ ] Should have `r2Url: "https://..."`

## Phase 6: Final Verification (5 minutes)

- [ ] Upload multiple files (test batch)
- [ ] Download different file types
- [ ] Check R2 bucket storage usage
- [ ] Verify MongoDB entries created correctly
- [ ] Monitor for any errors in server logs
- [ ] Check file organization structure
- [ ] Verify download counter increments

## Phase 7: Documentation Review

- [ ] Read `R2_SETUP.md` for detailed setup guide
- [ ] Read `R2_IMPLEMENTATION.md` for technical details
- [ ] Bookmark `R2_QUICK_REFERENCE.md` for quick lookup
- [ ] Review troubleshooting section in `R2_SETUP.md`
- [ ] Understand pricing structure

## Phase 8: Production Preparation

- [ ] Decide on hosting provider (Vercel, Heroku, etc.)
- [ ] Add R2 credentials to production environment
- [ ] Test upload/download in staging environment
- [ ] Monitor costs after first week of production
- [ ] Set up alerts for storage usage
- [ ] Plan backup strategy if needed
- [ ] Document any custom configurations

## Phase 9: Monitoring Setup (Optional)

- [ ] Set up Cloudflare billing alerts
- [ ] Monitor monthly storage usage
- [ ] Check R2 dashboard weekly
- [ ] Review API call counts
- [ ] Verify download speeds
- [ ] Track customer satisfaction

## Troubleshooting Quick Links

**If "R2 service not configured":**

1. Check `.env.local` has all 4 variables
2. Restart dev server
3. Verify exact variable names (case-sensitive)

**If "Access Denied":**

1. Verify Access Key ID in .env
2. Verify Secret Access Key in .env
3. Check API token permissions in Cloudflare
4. Regenerate API token if needed

**If "Bucket not found":**

1. Verify bucket name is exactly `prestige-designs-files`
2. Check bucket exists in R2 dashboard
3. Verify Account ID is correct

**If upload fails:**

1. Check server logs for detailed error
2. Verify R2 bucket has write permissions
3. Check file size (R2 supports up to 5 TB)
4. Try with a smaller file first

**If download fails:**

1. Check MongoDB document has `useR2: true`
2. Verify `r2FileKey` is correct
3. Check if file still exists in R2 bucket
4. Try downloading different file

## Success Criteria

✅ All boxes checked above
✅ API test endpoint returns success
✅ Can upload files to R2
✅ Can download files from R2
✅ Files appear in R2 bucket
✅ MongoDB entries track R2 files
✅ No errors in server logs
✅ Download speeds are acceptable
✅ All 4 environment variables set
✅ Cost tracking understood

## Notes & Observations

Write down any notes as you go:

```
[ Space for notes ]
Date started: ___________
Date completed: ___________
Any issues encountered: ________________
Resolution: ________________
Overall experience: ________________
```

---

**Remember**: This is a straightforward setup. Most users complete it in under 1 hour. If you get stuck, refer to the troubleshooting section in `R2_SETUP.md` or check the detailed implementation guide in `R2_IMPLEMENTATION.md`.

**You've got this!** 🚀
