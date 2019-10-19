# Introduction 
[Webhint](https://webhint.io/) Azure pipelines task implementation.

# Getting Started 

1. Clone repository
2. Install extensions packaging tool
    > npm install -g tfx-cli

3. Edit vss-extension.json 
	- update Publisher Id (see below how to get publisher Id)
	- Update version 

4. Execute npm install in both folders:
	- WebhintV1 
	- WebhintV1/task

5. Cd into WehintV1 folder and execute "
    > npm run compile

6. Execute 
    > "tfx extension create"
   - File will be created in format 
  
        > &lt;publisher&gt;.&lt;name&gt;-&lt;version&gt;.vsix 
	- Marketplace will not allow size greater than 1000 files (or assets)
	- Remove node modules from vss-extension.json "files" attribute
	- Update version number in vss-extension.json to a greater version (required) 
	- Run the following command to create extension and upload new published file without node modules to marketplace (should allow)
        > tfx extension create
	- Add node modules back to vss-extension.json
	- Update version number again in vss-extension.json to a greater version (required every update) 
	- Recreate extension and update file in marketplace. 
        > tfx extension create 
    - NOTE: An update to the file in Marketplace will allow size greater than 1000 files. An initial upload will not allow such large sizes. 
     
            

7. Marketplace will give an error for the following package, delete it and follow above steps to recompile and upload. Remember to update version number or published file will not reflect updates. 

Once extension creation has succeeded, click on 3 dots menu next to extension name (...) and select share/unshare. Share with your organization. 

Select "View extension" in menu then select the following in order: 
-  Get it free
- Select organization and install 
- Go to organization page, then select project
- Go to pipelines and select new pipeline
- Add PowerShell task before Webhint task to install dependencies
    > npm i -g hint
- Add Webhint extension and set url to test
- Run Pipeline

# Credit
Based on lighthouse azure pipelines extension Copyright © 2018, Groupe Sharegate inc.
https://github.com/sharegate/azure-pipelines-lighthouse