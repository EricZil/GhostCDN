# 👻 GhostCDN

<div align="center">
  
[![Built at Hack Club](https://img.shields.io/badge/Built%20at-Hack%20Club-fa0f00?style=for-the-badge)](https://hackclub.com/)
[![Summer of Making](https://img.shields.io/badge/Summer%20of%20Making-2025-blue?style=for-the-badge)](https://summer.hackclub.com)
[![Status](https://img.shields.io/badge/Status-Shipped-green?style=for-the-badge)]()

<a href="https://github-readme-stats.hackclub.dev/api/wakatime?username=4782&api_domain=hackatime.hackclub.com&theme=radical&custom_title=Hackatime+Stats&layout=compact">
  <img src="https://github-readme-stats.hackclub.dev/api/wakatime?username=4782&api_domain=hackatime.hackclub.com&theme=radical&custom_title=Hackatime+Stats&layout=compact" alt="Hackatime Stats" />
</a>

</div>

## 👀 What's this all about?

**GhostCDN** is a lightning-fast, developer-friendly content delivery network built for the modern web. Think of it as your personal CDN that doesn't suck—upload images, get instant global links, and watch your content fly across the internet at ghost speed 👻

**The TL;DR:**
- 🚀 **Instant uploads** via drag & drop or Ctrl+V
- 🌍 **Global CDN** powered by DigitalOcean Spaces
- 🖼️ **Smart image processing** with automatic optimization & WebP thumbnails  
- 👥 **Guest friendly** - 10MB uploads, no signup required (14-day retention)
- 🔐 **Power user ready** - Unlimited storage for registered users
- 📊 **API Analytics** - Monitor API usage and performance
- ⚡ **Developer focused** - Clean APIs, proper auth, admin controls

**Also!** DataShadow's bff - Claude AI ❤️

> **⚠️ HEADS UP!** This project has been shipped to SoM! But it's not over;)

## 📓 Devlogs

### Devlog #6 - Release
![Devlog #6](https://cdn.gcdn.space/SoM/GhostCDN/devlog6.png)

It’s happening. We’re live. <br>

✅ Updated UI for Verify & Password Reset pages  
✅ Upload flow got a glow-up <br>
✅ Added a 404 page (because you will find a way to break stuff) <br>
✅ Fixed the cursed QR code in Image Viewer <br>
✅ And a bunch of stealth fixes I’m too lazy to list lol <br>

🎉 BETA is officially out! Registrations are OPEN. <br>
Expect bugs lurking in the shadows, but the CDN? Nahhh, that beast is solid and fully operational. <br>

This was the main goal all along—make a CDN that just works. Mission accomplished (for now). <br>

And yeah, don’t panic—this isn’t the end. I’m not abandoning anything. Ghost CDN will keep getting updates even after shipping. <br>

More chaos soon 👻

### Devlog #5 - Ban Hammer, Speed Boost, and Chaos
![Devlog #5](https://cdn.gcdn.space/SoM/GhostCDN/devlog5.png)

Performance? ✅ About ~60% faster uploads now. <br>
Caching? ✅ Redis online. <br>
Dashboard? ✅ Re-structured, Uploads tab got a shiny new buttons! <br>

Also added: <br>
New CDN behind the scenes. <br>
Email + password reset flows (finally). <br>
Fresh backend endpoints for Admin (so fresh I managed to ban my own account without actually banning it—don’t ask 💀). <br>
Account Settings storage updates. <br>
Misc backend witchcraft. <br>
A bunch of other tweaks I already forgot about lol. <br>
Analytics and Storage stats are postponed to a future devlog—too many moving pieces for today. <br>

Registration is still disabled because I’m way too tired to debug every corner right now. I’ll tackle that tomorrow. <br>

More ghostly updates coming soon 👻

### Devlog #4 - +13377
![Devlog #4](https://cdn.gcdn.space/SoM/GhostCDN/devlog4.png)

@$#%&. What’s “+13377”? Just +13377 lines of glorious chaos since the last commit 💀 <br>
But heyyy, rewrote half the backend again! (send help) <br>
As always, the backend was NOT in the mood to cooperate, buuuut I finally wrestled it into submission. <br>

✨ What’s new? <br>
Fully working Dashboard (yes, it actually works, I’m shook) <br>
Half-working Admin Dashboard (good enough for now lol) <br>
Updated UIs all around <br>
Auth improvements (sign in like a pro) <br>

🔐 Guest Uploads: <br>
Upload up to 10MB per file, and I’ll babysit your stuff for 2 weeks. <br>
💀 Want more? <br>
Sign up to the GhostCDN family—unlimited size uploads and lifetime CDN links. Seriously. It’s worth it. <br>

And yeahhh, this ain’t the end. Way more coming soon! 👻 <br>

Next up: <br>
Finish backend (again) <br>
Email services <br>
Image upscaling <br>
Faster uploads <br>
Image optimization <br>
And everyone’s favorite—debugging everything. <br>

Stay tuned!

### Devlog #3 - A loooot of changes
![Devlog #3](https://cdn.gcdn.space/SoM/GhostCDN/devlog3.png)

Yeah, it’s been a hot minute since the last devlog. But no, I wasn’t slacking off (mostly). <br>

Had to partially rewrite the backend because Vercel said “lol nope” to anything over 4.5MB uploads. So now we’re rocking presigned URLs instead. <br>
Changed up a bunch of UI bits. <br>
Added authentication (yep, even social logins for all you lazy gremlins). <br>
Built account settings. <br>
Started working on the Dashboard. <br>

Coming up next: <br>
Image upscaling (your memes will finally hit 4K) <br>
Email verification and password resets for the folks avoiding social logins <br>

Heads up: the Dashboard design is still early. No promises it’ll look the same in the next devlog. <br>

If the backend doesn’t rebel again, you’ll see a shiny DEMO in the next devlog. <br>

Real soon… Ghost 👻 will be unleashed. <br>

### Devlog #2 - Drag. Drop. Paste. Upload. Ghosted. 👻
![Devlog #2](https://cdn.gcdn.space/SoM/GhostCDN/devlog2.png)
Upload flow is finally alive — drag & drop is working, CTRL+V slaps too. Instantly yeet your images into the abyss. <br>

Backend’s still angry with me, but we’re getting there. <br>
More chaos loading…


### Devlog #1 - GHOST CDN
![Devlog #1](https://cdn.gcdn.space/SoM/GhostCDN/devlog1.png)

👻 rise from the dead, a new project has spawned... <br>
Spun up the first version of the site — minimal, shady, and definitely built past midnight <br>
Built the base upload flow for the CDN (still designing it tho) <br>
Backend is coming to life — files gonna fly soon. <br>

The haunt just started.

## ✨ Core Features

### 🚀 **Lightning-Fast File Delivery**
- **Global CDN**: Powered by DigitalOcean Spaces for worldwide content delivery
- **Instant Access**: Direct upload to CDN with presigned URLs for optimal performance
- **Smart Caching**: Multi-tier caching with Redis and fallback systems

### 📤 **Flexible Upload Options**
- **Guest Uploads**: Quick uploads without registration (10MB limit, 14-day retention)
- **User Uploads**: Unlimited storage for registered users (100MB file limit)
- **Multiple Methods**: Drag & drop, paste (Ctrl+V), or traditional file selection
- **Direct Upload**: Client-side upload directly to CDN, no server bottlenecks

### 🖼️ **Advanced Image Processing**
- **Smart Optimization**: Automatic compression with format-specific settings
- **Thumbnail Generation**: Multiple sizes (small, medium, large) in WebP format
- **EXIF Control**: Choose to preserve or strip metadata for privacy
- **Sharp Processing**: High-quality image manipulation with Sharp.js

### 📊 **API Analytics & Insights**
- **API Usage Tracking**: Monitor API requests and performance metrics
- **Visual Dashboard**: Interactive charts showing API usage patterns over time
- **Storage Insights**: Monitor storage usage with detailed breakdowns
- **Request Analytics**: Track response times, status codes, and endpoints
- **Coming Soon**: Advanced API metrics and reporting

### 🔐 **Enterprise Security**
- **Rate Limiting**: Smart rate limits with higher allowances for authenticated users
- **User Management**: Complete authentication with email verification
- **Admin Controls**: User management, ban system, and system monitoring
- **Ban System**: Comprehensive IP, email, account, and full ban capabilities
- **Coming Soon**: User API keys for integrations

### ⚙️ **Smart Management**
- **Auto Cleanup**: Scheduled deletion of expired guest uploads
- **Bulk Actions**: Select and manage multiple files simultaneously
- **File Search**: Advanced filtering and search capabilities
- **System Messages**: Real-time notifications for maintenance and updates
- **Coming Soon**: Bulk download functionality

## 🛠️ Built With

### **Frontend**

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Framer Motion](https://www.framer.com/motion/)** - Smooth animations and transitions
- **[TanStack Query](https://tanstack.com/query)** - Powerful data fetching and caching
- **[NextAuth.js](https://next-auth.js.org/)** - Complete authentication solution
- **[Recharts](https://recharts.org/)** - Beautiful analytics visualizations

### **Backend**

- **[Node.js](https://nodejs.org/)** - JavaScript runtime environment
- **[Express.js](https://expressjs.com/)** - Fast, unopinionated web framework
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM with type safety
- **[MySQL](https://www.mysql.com/)** - Reliable relational database
- **[Sharp](https://sharp.pixelplumbing.com/)** - High-performance image processing

### **Infrastructure & Services**

- **[DigitalOcean Spaces](https://www.digitalocean.com/products/spaces)** - S3-compatible object storage and CDN
- **[Upstash Redis](https://upstash.com/)** - Serverless Redis for caching
- **[AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/)** - S3-compatible API interactions
- **[Vercel](https://vercel.com/)** - Deployment and hosting platform

### **Development & Security**

- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[JWT](https://jwt.io/)** - Secure token-based authentication
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Password hashing
- **[Helmet](https://helmetjs.github.io/)** - Security middleware
- **[express-rate-limit](https://www.npmjs.com/package/express-rate-limit)** - Rate limiting protection
- **[Winston](https://github.com/winstonjs/winston)** - Professional logging
- **[ESLint](https://eslint.org/)** - Code quality and consistency

## 🤝 Contribute

Found a bug? Have an idea? Want to contribute? Great! Open an issue or submit a PR. We're all about community collaboration!

## 🙏 Acknowledgments

- The amazing HackClub community
- All the hackers participating in Summer of Making
- Coffee ☕, the true hero behind all coding projects (don't forget RedBull)

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---