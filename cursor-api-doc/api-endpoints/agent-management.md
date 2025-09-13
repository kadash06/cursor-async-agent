Core
Background Agents API
API Endpoints
Agent Management
Launch an Agent
Start a new background agent to work on your repository.

POST
/
v0
/
agents
Authorizations
​
Authorization
stringheaderrequired
API key from Cursor Dashboard

Body
application/json
​
prompt
objectrequired
Show child attributes

​
source
objectrequired
Show child attributes

​
model
string
The LLM to use

Minimum length: 1
Example:
"claude-4-sonnet"

​
target
object
Show child attributes

​
webhook
object
Show child attributes

Response

201

application/json
Agent created successfully

​
id
stringrequired
Unique identifier for the background agent

Example:
"bc_abc123"

​
name
stringrequired
Name for the agent

Example:
"Add README Documentation"

​
status
enum<string>required
Initial status of the newly created agent

Available options: CREATING
Example:
"CREATING"

​
source
objectrequired
Show child attributes

​
target
objectrequired
Show child attributes

​
createdAt
string<date-time>required
When the agent was created

Example:
"2024-01-15T10:30:00Z"

Was this page helpful?

Yes

No
Agent Conversation
Add Follow-up
Ask a question...

Launch an agent

Copy

Ask AI
curl --request POST \
 --url https://api.cursor.com/v0/agents \
 --header 'Authorization: Bearer <token>' \
 --header 'Content-Type: application/json' \
 --data '{
"prompt": {
"text": "Add a README.md file with installation instructions",
"images": [
{
"data": "iVBORw0KGgoAAAANSUhEUgAA...",
"dimension": {
"width": 1024,
"height": 768
}
}
]
},
"source": {
"repository": "https://github.com/your-org/your-repo",
"ref": "main"
}
}'

201

400

401

403

429

500

Copy

Ask AI
{
"id": "bc_abc123",
"name": "Add README Documentation",
"status": "CREATING",
"source": {
"repository": "https://github.com/your-org/your-repo",
"ref": "main"
},
"target": {
"branchName": "cursor/add-readme-1234",
"url": "https://cursor.com/agents?id=bc_abc123",
"autoCreatePr": false
},
"createdAt": "2024-01-15T10:30:00Z"
}
