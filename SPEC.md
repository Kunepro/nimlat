# Anime Library Tracker - Application Specification

## 1. Overview

The Anime Library Tracker is a desktop application built with Electron, React, TypeScript, and SQLite that helps track anime collection integration with Plex. It serves as a management tool to monitor the status of various anime titles, series, seasons, and episodes in relation to the user's media library.

## 2. Core Features

### 2.1 Data Structure
- **Hierarchical Organization**:
    - IP (Intellectual Property, e.g., "Gintama")
        - Series/Films (e.g., main series, spin-offs, films)
            - Seasons (for series only)
                - Episodes

- **Cross-IP Relationships**: Episodes, seasons, or series can belong to multiple IPs (crossovers)

### 2.2 Data Sources
- AniList API integration for fetching anime data
- Local SQLite database as single source of truth
- User-generated status flags and notes

### 2.3 Status Tracking
For each episode:
- Downloaded
- Renamed according to Plex conventions
- Properly placed in file system
- Recognized by Plex
- Issues (with optional notes)
- Ready status (all positive statuses are true)
- Ignored status

### 2.4 Display Organization
- Table-based interface with expandable rows
- IPs organized into four blocks:
    1. Partially completed anime (top)
    2. Uncompleted anime (second)
    3. Fully integrated anime (third)
    4. Ignored anime (bottom)
- Within each block, IPs are sorted alphabetically

### 2.5 Query Management
- Search for anime by name via AniList API
- Save search results to local database
- Rerun previous queries to update data with new episodes/content
- Ensure unique queries to prevent duplication

## 3. Technical Implementation

### 3.1 Backend
- **Electron**: Cross-platform desktop application framework
- **SQLite**: Persistent data storage
- **Node.js**: Runtime environment for backend operations

### 3.2 Frontend
- **React**: UI framework
- **TypeScript**: Type-safe programming language
- **Virtual Scrolling**: Implementation for performance with large datasets
    - Fixed-height rows approach for expandable content

### 3.3 Database Schema
- Tables for:
    - IPs
    - Series/Films
    - Seasons
    - Episodes
    - Cross-references for multi-IP relationships
    - Status flags
    - Search history

### 3.4 API Integration
- **AniList API**: GraphQL queries for anime data
- Rate limiting handling implementation

## 4. User Interface

### 4.1 Main View
- Expandable hierarchical table displaying anime IPs
- Dark theme design
- Status indicators at each level (IP, Series, Season, Episode)
- Ability to expand/collapse rows

### 4.2 Search Interface
- Search field for anime titles
- Display of search results with option to add to library
- History of previous searches with rerun capability

### 4.3 Status Management
- UI controls to update statuses
- Notes field for issues
- Bulk status update functionality (cascade to children)

### 4.4 Sorting Logic
- IPs sorted by completion status blocks, then alphabetically
- Series and films sorted by release date within an IP
- Seasons sorted by release date within a series
- Episodes sorted numerically within a season

## 5. Data Flow

### 5.1 Initial Data Load
- User searches for an anime IP
- App fetches data from AniList API
- Results stored in SQLite database
- UI displays hierarchical view

### 5.2 Update Mechanism
- User can rerun previous queries
- New content added to existing items
- Status updates for parent items if new children are added
- Preservation of user-added flags and notes

### 5.3 Conflict Resolution
- Manual deletion option for data correction
- Unique identification of anime elements to prevent duplication

## 6. Import/Export
- Database export/import functionality for transferring data between computers
- No user authentication required (single-user desktop application)

## 7. Future Enhancements (Not in v1)
- Advanced table filtering capabilities
- Automated query updates
- Backup and restore functionality

## 8. Technical Stack
- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Programming language
- **SQLite**: Database
- **Vite**: Build tool
- **GraphQL**: For AniList API queries