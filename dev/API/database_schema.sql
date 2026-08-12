-- Lead Generation MySQL Database Schema

CREATE DATABASE IF NOT EXISTS lead_generation_db;
USE lead_generation_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'banned') DEFAULT 'active',
    package ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    daily_credits INT DEFAULT 50,
    used_credits_today INT DEFAULT 0,
    last_credit_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
    rate_limit_violations INT DEFAULT 0,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. System Settings Table (Announcements, default package limits)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. User Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    user_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample Data (Optional test users)
INSERT INTO users (id, name, email, password, status, package, daily_credits, used_credits_today, rate_limit_violations, last_login, created_at)
VALUES 
  (1, 'Admin User', 'admin@leadgen.com', '$2b$10$GJ2L8xQ0w3dF9H1kL2M3Ne4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C', 'active', 'enterprise', 999999, 0, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE id=id;
