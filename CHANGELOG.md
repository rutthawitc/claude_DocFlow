# DocFlow Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.1] - 2025-09-17

### 🐛 Critical Bug Fixes
- **Fixed document acknowledgment issue**: Resolved `TypeError: Cannot convert undefined or null to object` preventing users from acknowledging documents
- **Fixed field reference errors**: Changed incorrect `title` field references to `subject` in document queries
- **Enhanced database query safety**: Changed from `innerJoin` to `leftJoin` for optional relationships to handle missing data gracefully

### ⚡ Improvements
- **Added comprehensive error handling utility**: New `DatabaseErrorHandler` class for robust database operation safety
- **Enhanced document status update**: Added null safety validation and proper error handling
- **Improved production stability**: Better handling of data inconsistencies between development and production

### 🚀 Infrastructure
- **Added automated deployment script**: `./scripts/deploy-update.sh` for streamlined Docker updates
- **Zero-downtime deployment**: Support for rolling updates with `docker-compose up -d --no-deps app`
- **Enhanced Docker workflow**: Complete image build, push, and pull workflow documentation

### 📚 Documentation
- **Added production bug analysis**: Comprehensive analysis in `docs/PRODUCTION_BUG_ANALYSIS.md`
- **Updated deployment guide**: Enhanced `docs/DOCKER_DEPLOYMENT.md` with image update workflow
- **Added production deployment notes**: Development vs production differences and best practices

### 💥 Impact
- ✅ **Users can now properly acknowledge documents** - Critical functionality restored
- ✅ **Zero-downtime deployment capability** - Production updates without service interruption
- ✅ **Robust error handling** - Prevents similar production issues in the future
- ✅ **Improved debugging** - Better error logging and validation for production issues

### 🔧 Technical Details
- Fixed: `documents.title` → `documents.subject` field references
- Changed: `innerJoin` → `leftJoin` for branches and users relationships
- Added: Comprehensive null checking in database queries
- Enhanced: Production deployment workflow with automated scripts

---

## [v1.0.0] - 2025-09-16

### 🎉 Initial Production Release

#### 🏗️ Core Features
- **Document Management System**: Complete document workflow (draft → sent_to_branch → acknowledged → sent_back_to_district → complete)
- **Multi-Branch Support**: 22 R6 region branches with BA codes and organizational structure
- **Authentication System**: External PWA API integration with local admin fallback
- **Role-Based Access Control**: 6 roles (admin, user, uploader, branch_user, branch_manager, district_manager) with 25 granular permissions
- **PDF Document Handling**: Upload, storage, viewing with CSP-compliant PDF.js workers
- **Comment System**: Real-time document commenting and collaboration
- **Additional Documents**: Multi-file document support with verification workflow

#### 🔧 Infrastructure
- **Next.js 15.4.1**: App Router with React 19 and TypeScript 5.8.3
- **Database**: PostgreSQL 17.5 with Drizzle ORM 0.43.1
- **Caching**: Redis integration with in-memory fallback
- **Docker Support**: Production-ready containerization with Alpine Linux
- **Session Management**: Enhanced JWT-based sessions with dual timeout system (30min idle, 4hr absolute)

#### 🚨 Monitoring & Notifications
- **Activity Logging**: Comprehensive audit trail for all document actions
- **Telegram Integration**: Real-time notifications for document workflow events
- **Health Monitoring**: API health checks with database and cache status
- **System Settings**: Database-persisted configuration with maintenance mode
- **File Management**: Advanced file statistics, cleanup, and backup functionality

#### 🛡️ Security Features
- **Content Security Policy**: Configured for PDF worker support
- **File Validation**: PDF mime type and size validation on upload
- **Rate Limiting**: API endpoints protected (login, upload, general API)
- **CSRF Protection**: Cross-site request forgery protection
- **Access Control**: Branch-level document access based on user assignments

#### 🎨 User Experience
- **Progressive Web App**: PWA capabilities with offline support
- **Responsive Design**: Tailwind CSS 4.1 with shadcn/ui component library
- **Thai Language Support**: Complete localization for Thai users
- **Session Timeout Warnings**: User-friendly session management with extension options
- **Professional UI**: Modern interface with comprehensive form validation

#### 📊 Data Management
- **22 R6 Branches**: Complete branch structure with BA codes (1060-1245)
- **Document Status Tracking**: Full workflow state management
- **Comment History**: Threaded comments with user attribution
- **Status History**: Complete audit trail of document state changes
- **File Storage**: Secure file storage with metadata tracking

#### 🐳 Deployment
- **Docker Hub**: Pre-built images available at `rutthawitc/docflow`
- **Docker Compose**: Complete production deployment configuration
- **SQL Initialization**: Comprehensive database setup script
- **Health Checks**: Container health monitoring and automatic restarts
- **Volume Management**: Persistent data storage for uploads and database

#### 📈 Performance
- **Caching Strategy**: Multi-layer caching with Redis and in-memory fallback
- **Database Optimization**: Strategic indexes for query performance
- **CDN Ready**: Optimized static asset handling
- **Bundle Optimization**: Next.js production build optimization

---

## Release Notes

### Version Numbering
- **Major** (x.0.0): Breaking changes, major feature additions
- **Minor** (0.x.0): New features, non-breaking changes
- **Patch** (0.0.x): Bug fixes, minor improvements

### Support
- 📚 **Documentation**: Complete guides in `docs/` directory
- 🐛 **Issues**: Report bugs via GitHub issues
- 🚀 **Deployment**: Docker Hub and source-based deployment supported

---

*Last updated: September 17, 2025*