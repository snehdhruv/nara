# Production Launch Checklist 🚀

**Target**: Launch MVP in 2 days
**Goal**: Multiple users can use the app with isolated progress/data

---

## **🔥 Critical Issues (Day 1 - 4 hours)**

### Authentication System Fix ⚡ **HIGH PRIORITY**
- [ ] **Fix broken `auth-utils.ts`** - Current implementation doesn't actually use BetterAuth
- [ ] **Replace demo user logic in `/api/books/[id]/route.ts`** (2 locations - lines 15-30 and 127-142)
- [ ] **Replace demo user logic in `/api/books/route.ts`** (lines 14-35)
- [ ] **Replace demo user logic in `/api/books/recent/route.ts`** (lines 14-33)
- [ ] **Update frontend to handle auth states** - Add sign-in/sign-out UI components
- [ ] **Test user isolation** - Verify different users have separate progress

### Environment Variables Fix ⚡ **HIGH PRIORITY**
- [ ] **Remove hardcoded secrets from `.env.local`**
- [ ] **Set up production environment variables** in hosting platform (Vercel/Railway/etc.)
- [ ] **Update `SITE_URL` and `CONVEX_SITE_URL`** for production domains
- [ ] **Configure OAuth redirect URLs** for production environment
- [ ] **Test auth flows work** with production URLs

### Database Cleanup 🧹 **MEDIUM PRIORITY**
- [ ] **Write cleanup script** to remove demo users and orphaned progress
- [ ] **Reset progress data** to ensure clean launch state
- [ ] **Verify database schema** is ready for multi-user

---

## **🏗️ RESTful API Improvements (Day 1 - 2 hours)**

### Fix Non-RESTful Patterns
- [ ] **Split progress endpoints**: 
  - [ ] `/api/progress?type=current` → `/api/progress/current`
  - [ ] `/api/progress?type=completed` → `/api/progress/completed`
- [ ] **Separate concerns in `/api/books/[id]`** - Split book fetching from progress updates
- [ ] **Consistent ID handling** - Better validation for Convex IDs vs YouTube IDs
- [ ] **Remove mixed responsibilities** from route handlers

---

## **🌐 Production Deployment (Day 2 - 3 hours)**

### Deployment Setup
- [ ] **Configure production domain** and SSL certificate
- [ ] **Set up hosting platform** (Vercel recommended for Next.js)
- [ ] **Deploy Convex backend** to production
- [ ] **Test deployment pipeline** works end-to-end

### Production Testing
- [ ] **Test user registration/login** flow in production
- [ ] **Test progress tracking** across different users
- [ ] **Test YouTube video processing** still works
- [ ] **Test voice QA functionality** 
- [ ] **Test all major user flows** work without errors

### Optional Production Enhancements
- [ ] **Set up error tracking** (Sentry/LogRocket)
- [ ] **Set up basic monitoring** (uptime checks)
- [ ] **Configure production logging**

---

## **✅ Current Status**

### Recently Fixed ✅
- [x] **Hard-coded DEMO_USER_ID validation error** - Fixed in progress routes
- [x] **Semantic chunking issue** - Restored proper paragraph chunking from tools
- [x] **Convex ID validation errors** - Fixed getAudiobook calls with YouTube IDs
- [x] **Progress routes authentication** - Now properly require auth
- [x] **Tools folder corruption** - Restored to working commit

### Known Working Features ✅
- [x] YouTube video processing and ingestion
- [x] Voice QA functionality  
- [x] Semantic paragraph chunking (2-4 sentences)
- [x] BetterAuth configuration (needs frontend integration)
- [x] Database schema supports multi-user

---

## **🚫 Out of Scope (Keep MVP Simple)**

- ❌ Complex user management features
- ❌ Advanced auth providers beyond Spotify
- ❌ Performance optimizations
- ❌ Advanced error handling/retry logic
- ❌ Analytics and metrics
- ❌ Complex onboarding flows
- ❌ Advanced UI/UX improvements

---

## **⏱️ Time Estimates**
- **Authentication Fixes**: 3-4 hours
- **Environment Setup**: 1-2 hours  
- **API Improvements**: 2 hours
- **Deployment & Testing**: 3 hours
- **Total**: ~9 hours over 2 days

---

## **🎯 Launch Success Criteria**

**Must Have**:
- [ ] Multiple users can create accounts
- [ ] Users have completely isolated progress/data
- [ ] Core features work: YouTube processing, voice QA, progress tracking
- [ ] App runs stably in production environment

**Nice to Have**:
- [ ] Error tracking configured
- [ ] Clean, professional UI for auth flows
- [ ] Basic monitoring in place

---

## **🔍 Files That Need Changes**

### Authentication Files
- `src/lib/auth-utils.ts` - Fix broken BetterAuth integration
- `src/app/api/books/[id]/route.ts` - Remove demo user fallbacks (lines 15-30, 127-142)
- `src/app/api/books/route.ts` - Remove demo user creation (lines 14-35)  
- `src/app/api/books/recent/route.ts` - Remove demo user logic (lines 14-33)

### Environment Files
- `.env.local` - Remove hardcoded secrets, update for production
- Production environment variables setup

### API Structure (Optional)
- `src/app/api/progress/route.ts` - Split into separate endpoints
- `src/app/api/books/[id]/route.ts` - Separate book fetching from progress updates

### Frontend (Required)
- Add sign-in/sign-out UI components
- Handle authentication states
- Test user flows

---

## **💡 Next Steps**
1. Start with authentication fixes (highest impact)
2. Set up production environment 
3. Test core user flows
4. Deploy and validate
5. Monitor for issues post-launch