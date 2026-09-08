# System Analysis and Design Documentation

## 1. Problem Statement

The university's ICT office currently receives technical concerns through verbal requests, text messages, and social media messages. Because requests come from different channels, some concerns are forgotten, duplicated, or not properly monitored. There is no centralized system to track the status of requests, leading to poor accountability and delayed resolution.

## 2. Actors

| Actor | Description |
|-------|-------------|
| System User / ICT Personnel | Authorized individuals who submit, view, update, and delete service requests. They must authenticate before accessing the system. |

## 3. Use Case Descriptions

### UC-01: Login
**Actor:** System User  
**Description:** The user logs in using their Supabase-authenticated account.  
**Pre-condition:** User has a valid account.  
**Post-condition:** User gains access to the dashboard.

### UC-02: View Dashboard
**Actor:** System User  
**Description:** After login, the user sees summary statistics of all service requests (Total, Pending, In Progress, Completed).  
**Pre-condition:** User is authenticated.  
**Post-condition:** User is informed of the current request status distribution.

### UC-03: Create Request
**Actor:** System User  
**Description:** The user submits a new service request by filling out the required fields. The system automatically assigns the request to the logged-in user and sets the status to Pending.  
**Pre-condition:** User is authenticated.  
**Post-condition:** A new record is created in the database.

### UC-04: View Requests
**Actor:** System User  
**Description:** The user views all service requests in a tabular format.  
**Pre-condition:** User is authenticated.  
**Post-condition:** All requests are displayed.

### UC-05: Search Request
**Actor:** System User  
**Description:** The user searches for requests by requester name or description.  
**Pre-condition:** User is authenticated and there are existing requests.  
**Post-condition:** Matching requests are displayed.

### UC-06: Filter Requests
**Actor:** System User  
**Description:** The user filters requests by status (Pending, In Progress, Completed) and priority (Low, Medium, High).  
**Pre-condition:** User is authenticated and there are existing requests.  
**Post-condition:** Only matching requests are displayed.

### UC-07: Update Request
**Actor:** System User  
**Description:** The user modifies an existing request's details (requester name, department, category, description, priority, status).  
**Pre-condition:** User is authenticated and the request belongs to them.  
**Post-condition:** The database record is updated.

### UC-08: Delete Request
**Actor:** System User  
**Description:** The user deletes a request after confirming the action.  
**Pre-condition:** User is authenticated and the request belongs to them.  
**Post-condition:** The record is removed from the database.

### UC-09: Logout
**Actor:** System User  
**Description:** The user ends their session.  
**Pre-condition:** User is authenticated.  
**Post-condition:** User is redirected to the login page.

## 4. Business Rules

| Rule ID | Rule Description |
|---------|------------------|
| BR-01 | Requester name cannot be empty. |
| BR-02 | Department must be provided. |
| BR-03 | Category must be selected. |
| BR-04 | Description must contain sufficient information (minimum 10 characters). |
| BR-05 | Priority must be Low, Medium, or High. |
| BR-06 | New requests automatically receive Pending status. |
| BR-07 | Users must log in before managing requests. |
| BR-08 | A confirmation must appear before deleting a record. |
| BR-09 | Date requested must automatically be recorded upon creation. |
| BR-10 | Unauthorized database modification should be prevented through RLS policies. |

## 5. Database Design

### Table: service_requests

| Field | Type | Constraints |
|-------|------|-------------|
| id | bigint | PRIMARY KEY, Auto-increment |
| requester_name | text | NOT NULL |
| department | text | NOT NULL |
| category | text | NOT NULL |
| description | text | NOT NULL |
| priority | text | NOT NULL |
| status | text | DEFAULT 'Pending' |
| created_at | timestamptz | DEFAULT NOW() |
| user_id | uuid | REFERENCES auth.users(id) |

### Relationships

- One User can create Many Service Requests (1:M)
- The `user_id` foreign key links each request to its creator

## 6. System Architecture

```
+---------------------+
|     GitHub Pages    |
|   (Static Hosting)  |
+---------------------+
           |
    +------+------+
    |             |
+---------+  +----------+
| HTML/   |  | JavaScript|
| CSS     |  | (ES6+)    |
+---------+  +----------+
    |             |
    +------+------+
           |
    +------+------+
    | Supabase JS |
    |   Client    |
    +------+------+
           |
    HTTPS / API
           |
    +------+------+
    |   SUPABASE  |
    |             |
    +------+------+
           |
    +-----+-----+
    |           |
+---------+ +---------+
| Auth    | | Postgres |
| Service | | Database |
+---------+ +---------+
```

## 7. Input Validation Rules

- **Requester Name:** Required, non-empty string
- **Department:** Required, non-empty string
- **Category:** Required, must be one of the predefined options
- **Description:** Required, minimum 10 characters
- **Priority:** Required, must be Low, Medium, or High
- **Status:** Optional on edit (defaults to Pending on new requests)

## 8. Security Considerations

1. **Authentication:** All database operations require a valid Supabase session.
2. **Authorization:** Row Level Security (RLS) ensures users can only modify their own records.
3. **Key Management:** Only the publishable/anonymous key is used client-side. The service_role key is never exposed.
4. **Input Sanitization:** User inputs are escaped before rendering to prevent XSS attacks.

## 9. Constraints and Assumptions

- The system is designed for authenticated users only (no guest access).
- Users can view all requests but can only edit/delete their own.
- The system is intended for small to medium-scale usage within a university setting.
- No complex workflow or ticket assignment is implemented (single-user per request model).
