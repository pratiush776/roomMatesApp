const express = require('express');       
const nedb = require("nedb-promises");    
const bcrypt = require('bcrypt');
const { group } = require('console');

const app = express();                    
const users_db = nedb.create('users.jsonl');    
const groups_db = nedb.create('groups.jsonl');    

app.use(express.static('public'));      

app.use(express.json());

app.get('/users/data',(req,res)=>{
    res.send('data')
})

// route to get user record (Login)
app.post('/users/login', (req,res)=>{
    console.log('\nreq => login attempt:')     
    console.log(req.body.email+"\n")     
    users_db.findOne({email:req.body.email}) //   find matching doc    
        .then( async doc=>{
            if (doc){
                console.log(req.body.email,'found')
                // hash=bcrypt.hashSync(req.body.password, bcrypt.genSaltSync())
                if (bcrypt.compareSync(req.body.password,doc.password)) {
                    console.log('')
                    const rand=()=>Math.random(0).toString(36).substr(2);
                    const _authToken=(length)=>(rand()+rand()+rand()+rand()).substr(0,length);
                    doc.authToken=_authToken(40);

                    console.log('doc:')
                    console.log(doc)
                    await users_db.updateOne(
                        {email: doc.email}, 
                        { $set: doc })
                    .then(console.log('adding token in database success'))  
                    .catch(error=>console.log('adding token in database failed'));

                    delete doc.password;
                    console.log('Login Success')
                    if (doc.groupId){
                        await groups_db.findOne({groupId:doc.groupId})
                        .then (group_info => {
                            console.log("group found");
                            console.log(group_info);
                            doc.members=group_info.members;
                            doc.schedule=group_info.schedule;
                            if (group_info.admin==doc.userId){
                                doc.admin=true
                            }
                        })
                    }
                    console.log("doc sent to client:");
                    console.log(doc)
                    return res.send(doc);
                }
                else{
                    console.log({error:'Invalid password.'});
                    return res.send({error:'Invalid credentials.'});}
            }else{
                console.log({error:'Email not found.'})
                return res.send({error:'Invalid credentials.'});
            }
        })        //   respond with doc    
        .catch(error=>res.send({error})); 
});

// route to register user 
app.post('/users/register', async (req, res) => {
    console.log('\nreq => registration attempt:')     
    console.log(req.body.email)
    if (req.body.password && req.body.email && req.body.name) {
        if (await users_db.findOne({ email: req.body.email })) {
            res.send({ error: 'Email already exists.' });
            console.log("Email was not available")
            return;
        }
        console.log(req.body.email," available")
        req.body.password = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync());
        console.log('password hashed')
        const rand=()=>Math.random(0).toString(36).substr(2);
        const _authToken=(length)=>(rand()+rand()+rand()+rand()).substr(0,length);
        console.log('authentication token generated: ',_authToken)
        req.body.authToken=_authToken(40)
        
        const userId=(length)=>(rand()+rand()).substr(0,length);
        req.body.userId=userId(10).toUpperCase();
        console.log('inserting data in database')
        await users_db.insertOne(req.body)              
                .then(doc => {
                    delete doc.password;
                    console.log('success, details sent in response:');
                    console.log(doc)
                    res.send(doc)
                    console.log('Registration Success');
                    return;
                })  
                .catch(error => {
                    console.log('failed, error sent back:');
                    console.log(error)
                    return res.send({ error })});
        } else {
            console.log('Missing fields.')
            return res.send({error:'Missing fields.'})
        }
    });

// route to change user info
app.patch('/user/update_info',async (req,res)=>{ 
    console.log('\nreq => update info attempt:')  
    console.log(req.body)  
    if (req.body.authToken) {
        console.log('authentication token found')
        await users_db.findOne({userId:req.body.userId})
        .then(async doc => {
            console.log('userId found in database')
            if (doc.authToken != req.body.authToken){
                res.send({error: 'Invalid Token'})
                console.log('Invalid Token')
                return;
            } else if (doc.email == req.body.email && doc.name == req.body.name){
                console.log("Error : Provided same name and email");
                return;
            }else if (await users_db.findOne({ email: req.body.email })) {
                res.send({ error: 'Email already exists.' });
                console.log("Email was not available")
                return;
            }  else {
                console.log('sending new info to database')
                users_db.updateOne(
                        {userId: req.body.userId}, 
                        { $set: {name:req.body.name,email:req.body.email} })
                    .then(result=>{
                        result?console.log('Update Success'):console.log('Update Failed');
                        res.send(result?{ok:true}:{error:'Server Error.'})
                        return;    
                    })    
                    .catch(error=>{
                        console.log(error);
                        console.log('Update Failed')
                        res.send({error})
                        return;
                    });
            }
        })
        .catch(error=>{
            console.log(error);
            console.log('Update Failed');
            res.send({error});
            return;
        });
    }
 });

// route to update user's password
app.patch('/user/update_password',async (req,res)=>{ 
    console.log('\nreq => update password attempt:')  
    console.log(req.body.email)  
    if (req.body.authToken) {
        console.log('authentication token found')
        await users_db.findOne({email:req.body.email})
        .then(doc => {
            console.log('email found in database')
            if (doc.authToken != req.body.authToken){
                console.log('Invalid Token');
                return res.send({error: 'Invalid Token'});
            }
            else if (!bcrypt.compareSync(req.body.oldPass,doc.password)) {
                console.log('Incorrect Old Password');
                return res.send({error: 'Incorrect Old Password'});
            }
            else {
                hashedPass = bcrypt.hashSync(req.body.newPass, bcrypt.genSaltSync());
                console.log('new password hashed')
                console.log('sending new info to database')
                users_db.updateOne(
                        {email: req.body.email}, 
                        { $set: {password:hashedPass} })
                    .then(result=>{
                        result?console.log('Update Success'):console.log('Update Failed');
                        return res.send(result?{ok:true}:{error:'Server Error.'})
                        })    
                    .catch(error=>{
                        console.log(error);
                        console.log('Update Failed')
                        return res.send({error})});
            }
        })
        .catch(error=>{
            console.log(error);
            console.log('Update Failed')
            return res.send({error})
        });
    }
 });

// route to delete user doc (DELETE /users/:username)
app.delete('/user/delete/:userId/:authToken',async (req,res)=>{   
    console.log('\nreq => delete attempt:')  
    console.log(req.params)  
    if (req.params.authToken) {
        console.log('authentication token found')
        await users_db.findOne({userId:req.params.userId})
        .then(async doc => {
            console.log('userId found in database')
            if (doc.authToken != req.params.authToken){
                res.send({error: 'Invalid Token'})
                console.log('Invalid Token')
                return;
            }
        }) 
        console.log('authentication token found')  
        users_db.deleteOne({userId: req.params.userId})    
        .then(result=>{
            result?console.log('Deletion Success'):console.log('Deletion Failed');
            res.send(result?{ok:true}:{error:'Something went wrong.'})
            return;
        })    
        .catch(error=>{
            console.log(error);
            res.send({error});;
            return;
            });
    }else{
        console.log('Authentication Token not found');
        res.send({error:'Login again!'});
        return
    } 
});

//route to leave user's group
app.delete('/user/leave/:userId/:groupId/:authToken',async (req,res)=>{   
    console.log('\nreq => leave group:')  
    console.log(req.params)  
    if (req.params.authToken) {
        console.log('authentication token found')
        await users_db.findOne({userId:req.params.userId})
        .then(async doc => {
            console.log('userId found in database')
            if (doc.authToken != req.params.authToken){
                res.send({error: 'Invalid Token'})
                console.log('Invalid Token')
                return;
            } else {
                console.log('authentication token valid')
                console.log('Process initiated')
                
                users_db.update(
                    {userId: doc.userId }, 
                    {$unset: { groupId: true } },
                    {})
                .then(result=>{
                    result?console.log('Deletion Success in usersDB'):console.log('Deletion Failed in usersDB');
                })
                .catch(error=>{
                    console.log({error:'could not remove group id in usersDB'});
                    res.send({error});;
                    return;
                    });
                
                groups_db.update({ groupId: req.params.groupId }, { $pull: {members_id: doc.userId, members:doc.name} }, {})
                .then((numUpdated) => {
                    // Check if the update was successful
                    if (numUpdated) {
                        console.log('User removed from the group successfully');
                    } else {
                        throw new Error('Unable to remove user from the group');
                    }
                })
                .catch((error) => {
                    // Handle any errors
                    console.error('An error occurred:', error);
                });    
                res.send({status:"success"})
            }
        }) 
    }else{
        console.log('Authentication Token not found');
        res.send({error:'Login again!'});
        return
    } 
});

//route to join a group using group ID
app.post('/user/join/',async (req,res)=>{   
    console.log('\nreq => join group:')  
    console.log(req.body)  
    if (req.body.authToken) {
        console.log('authentication token found')

        await users_db.findOne({userId:req.body.userId})
        .then(async doc => {
            console.log('userId found in database')
            if (doc.authToken != req.body.authToken){
                res.send({error: 'Invalid Token'})
                console.log('Invalid Token')
                return;
            } else {
                console.log('authentication token valid')
                console.log('Process initiated')

                await groups_db.findOne({groupId:req.body.groupId})
                .then(async groupInfo=>{
                    if (groupInfo) {
                        console.log("group id found in database");
                        doc.members=groupInfo.members;
                        doc.members.push(doc.name);
                        doc.groupId=groupInfo.groupId;
                        doc.schedule=groupInfo.schedule;
                        await groups_db.update({ groupId: req.body.groupId }, { $push: {members_id: doc.userId, members:doc.name} }, {})
                        .then((numUpdated) => {
                            // Check if the update was successful
                            if (numUpdated) {
                                console.log('User added in the group successfully');
                            } else {
                                throw new Error('Unable to add user in the group');
                            }
                        })
                        .catch((error) => {
                            // Handle any errors
                            console.error('An error occurred:', error);
                            res.send({error:error})
                            return
                        });    

                        await users_db.updateOne(
                            {userId: req.body.userId}, 
                            { $set: {groupId:doc.groupId} })
                        .then(result=>{
                            result?console.log('Group id added in users db'):console.log('group id update Failed in db');
                            if (!result) return res.send({error:'Server Error.'})   
                        })    
                        .catch(error=>{
                            console.log(error);
                            console.log('Update Failed')
                            res.send({error:'Server Error!'})
                        });
                         
                        // toSend={status:"success",groupId:doc.groupId,members:doc.members}
                        toSend={
                            status:"success",
                            name:doc.name,
                            email:doc.email,
                            authToken:doc.authToken,
                            userId:req.body.userId,
                            groupId:doc.groupId,
                            members:doc.members,
                            schedule:doc.schedule
                        }
                        console.log('doc sent to client:',toSend)
                        res.send(toSend)
                            
                    } else {
                        console.log("\nGroup not found");
                        res.send({error:"Invalid Group Id"})
                        return
                    }
                    })
                .catch(error=>{
                    console.log(error);
                    res.send({error:"Server Error"})
                    return
                })
                }
            }) 
    }else{
        console.log('Authentication Token not found');
        res.send({error:'Login again!'});
        return
    } 
});

// route to create a new group
app.post('/user/create_group',async (req,res)=>{
    console.log('\nreq => create new group:')  
    console.log(req.body)  
    if (req.body.authToken) {
        await users_db.findOne({userId:req.body.userId})
        .then(async doc => {
            console.log('userId found in database')
            if (doc.authToken != req.body.authToken){
                console.log('Invalid Token');
                return res.send({error: 'Invalid Token'});
            } else {
                console.log("Authentication Token matched!!")
                const rand=()=>Math.random(0).toString(36).substr(2);
                let random=(length)=>(rand()+rand()).substr(0,length);
                let group_id=random(8).toUpperCase();
                let group_info={
                    groupId:group_id, 
                    members: [doc.name],
                    members_id:[req.body.userId],
                    admin:doc.userId,
                    schedule:schedule = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].reduce((acc, day) => {
                        acc[day] = []; // Initialize each day as an empty array
                        return acc;
                        }, {})
                }

                await groups_db.insertOne(group_info)              
                .then(doc => {
                    console.log('Group created:',doc);
                })  
                .catch(error => {
                    console.log('failed, error sent back:');
                    console.log(error)
                    return res.send({ error })
                });
                
                delete group_info.members_id

                await users_db.updateOne(
                    {userId: req.body.userId}, 
                    { $set: {groupId:group_id} })
                .then(result=>{
                    result?console.log('Group id added in users db'):console.log('group id update Failed in db');
                    return res.send(result?group_info:{error:'Server Error.'})   
                })    
                .catch(error=>{
                    console.log(error);
                    console.log('Update Failed')
                    res.send({error:'Server Error!'})
                    return;
                });
                console.log("success")
        }})
        .catch(error=>{
            console.log(error);
            console.log('Failed')
            return res.send({error:"Server Error"})
        });
    }
})

// route to update group's schedule
app.patch('/user/admin/updateSchedule',async (req,res)=>{ 
    console.log('\nreq => update schedule attempt:')  
    console.log(req.body)  
    if (req.body.authToken) {
        console.log('authentication token found')
        await users_db.findOne({userId:req.body.userId})
        .then(doc => {
            console.log('user found in database')
            if (doc.authToken != req.body.authToken){
                console.log('Invalid Token');
                return res.send({error: 'Invalid Token'});
            }
            else {
                console.log("Token Valid!\nChecking for authorization...")
                groups_db.findOne({groupId:req.body.groupId})
                .then(doc=>{
                    if (!doc.admin==req.body.userId){
                        console.log("Unauthorized Access!!!")
                        res.send({error:"Unauthorized Access!!!"})
                        return;
                    }
                })
                .catch(error=>{
                    console.log("Failed to authorize the user.")
                    res.send({error:"Server Error"})
                    return;
                })
                console.log("Authorized!")
                groups_db.updateOne(
                        {groupId: req.body.groupId}, 
                        { $set: {schedule:req.body.schedule}})
                    .then(result=>{
                        result?console.log('Update Success'):console.log('Update Failed');
                        return res.send(result?{ok:true}:{error:'Server Error.'})
                        })    
                    .catch(error=>{
                        console.log(error);
                        console.log('Update Failed')
                        return res.send({error})});
            }
        })
        .catch(error=>{
            console.log(error);
            console.log('Update Failed')
            return res.send({error})
        });
    } else {
        console.log("authToken not found")
        return res.send("AuthToken not found")
    }
 });

// default route
app.all('*',(req,res)=>{res.status(404).send('Invalid URL.')});

// start server
app.listen(3000,()=>console.log("Server started on http://localhost:3000"));
