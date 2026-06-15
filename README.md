# Bean Scene Mobile Ordering App

## Project Overview

This repository contains the front-end mobile ordering application for the Bean Scene case study. The application was developed using React Native and Expo as part of the ICT50220 Mobile Application Development assessment.

The app is designed for Bean Scene staff and managers to take customer orders, browse menu items, manage dishes and categories, manage staff accounts, and view ordering reports.

## Main Features

- Staff and manager login
- Bean Scene branded login screen
- Quick Login / demo login option for testing
- Manager-only Debug Settings
- Menu browsing by category
- Menu item search
- Add and remove items from an order
- Floating Order Summary
- Table and area selection using clear labels such as Main Table 1, Outside Table 1, and Balcony Table 1
- Notes and dietary requirements for orders
- Manage Dishes
- Manage Categories
- Manage Staff
- View Orders
- Ordering Reports

## Technologies Used

- React Native
- Expo
- JavaScript
- Firebase Firestore through backend REST API
- Node.js / Express backend API connection
- Local storage for app settings

## Project Setup

Install project dependencies:

```bash
npm install
```

Run the app:

```bash
npx expo start -c
```

Open the web preview:

```text
http://localhost:8081
```

## Backend Connection

The app connects to the Bean Scene backend REST API running at:

```text
http://localhost:5000
```

The backend must be running before the app can load menu items, categories, orders, and user records.

## Main Screens

- Login
- Take Order
- Order Summary
- Orders
- Manage Dishes
- Manage Categories
- Manage Staff
- Reports
- Debug Settings

## Assessment Notes

This project was created for the ICT50220 Mobile Application Development assessment. It follows the Bean Scene case study requirements, including staff ordering, menu management, category management, staff management, order reporting, and use of the Bean Scene branding/style guide.
