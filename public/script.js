let $ = document.querySelector.bind(document);

//----------------------------------------Dashboard Manipulation-------------------------------------------
signin_dashboard=$("#signin_dashboard");
loggedin_dashboard=$("#loggedin_dashboard");

inputFields= {
    signin_dashboard_fields:{
        login_section_fields:{email:$('#login_email'),password:$('#login_password')},
        register_section_fields:{password:$('#register_password'),name: $('#register_name'), email:$('#register_email')}
    },
    loggedin_dashboard:{
        account_fields_pass:{oldPass:$('#old_password'),newPass:$("#new_password")},
        account_fields:{userId:$("#user_id"),account_name:$("#account_name"),account_email:$("#account_email")},
        group_section:{no_group:$('#no_group'),mates_container:$("#mates_container")}
    }
}

signin_btn=$("#sign_in_btn");
join_btn=$("#join_btn");

login_section=$("#login");
register_section=$("#register");

logout_btn=$("#logout");

// ----------------Normal functionality------------------- //
$("#register_to_login_btn").addEventListener("click", ()=>{
    reset_fields(inputFields.signin_dashboard_fields.register_section_fields);
    dashboard_swap(register_section,login_section)
});
$("#login_to_register_btn").addEventListener("click", ()=>{
    reset_fields(inputFields.signin_dashboard_fields.login_section_fields);
    dashboard_swap(login_section,register_section);
});
logout_btn.addEventListener("click",logout)

function logout(){
    showError($("#loggedin_error"),"");
     showError($("#signin_error"),"");
     dashboard_swap(loggedin_dashboard,signin_dashboard);
     $("#home_btn").click();
     clear_loggedin_sections();

     //restoring admin panel screen if admin was logged in before
    if(!!$("#edit_btn")){
        const taskIds = ['monday_tasks', 'tuesday_tasks', 'wednesday_tasks', 'thursday_tasks', 'friday_tasks', 'saturday_tasks', 'sunday_tasks'];
            
        // Clears each task container
        taskIds.forEach(id => {
            const taskElement = document.getElementById(id);
            if (taskElement) {
                taskElement.innerHTML = ''; // Clears the content
                if (id!="monday_tasks") taskElement.classList.add('hidden'); // Ensure the container is hidden
            }
        });

        // Resets the input field
        const taskInput = document.getElementById('taskInput');
        if (taskInput) {
            taskInput.value = ''; // Resets the value of the input field
        }
        $("#select_member").innerHTML="";
    }

    if ($('#edit_btn')) {
        $('#edit_btn').remove();
    }
    if ($("#menu_toggle").classList.contains('isActive')) $("#menu_toggle").click();
    
    remove_all_child($(".today_container"))
    remove_all_child($("#memberBtnContainer"))
    remove_all_child($("#taskContent"))

    logged_out();
}
// -------------------------Login-------------------------- //

signin_btn.addEventListener("click",()=>{
    let userEmail=inputFields.signin_dashboard_fields.login_section_fields.email;
    let userPassword=inputFields.signin_dashboard_fields.login_section_fields.password;
    if(!userEmail.value || !userPassword.value)
        return;
    if(!userEmail.checkValidity() || !userPassword.checkValidity()){
        showError($("#signin_error"),'Fields cannot be empty and email must contain ( @ and . )');
        return;
    }
    var data={
        email: userEmail.value.toLowerCase(),
        password: userPassword.value
    };
    fetch('/users/login', {
                method: 'POST',  
                headers: {
                    'Content-Type': 'application/json'  
                },
                body: JSON.stringify(data)  
                })
        .then(response => response.json())  
        .then(doc => {
            if (doc.error) {
                reset_fields(inputFields.signin_dashboard_fields.login_section_fields);
                showError($("#signin_error"),doc.error)
            }
            else {
                let roomMates=JSON.parse(localStorage.room_mates);
                roomMates.status='loggedIn'
                roomMates.token=doc.authToken
                localStorage.room_mates=JSON.stringify(roomMates);
                reset_fields(inputFields.signin_dashboard_fields.login_section_fields);
                dashboard_swap(signin_dashboard,loggedin_dashboard);
                load_loggedin_dashboards(doc);
            }})
        .catch(err=>{
            reset_fields(inputFields.signin_dashboard_fields.login_section_fields);
            showError($("#signin_error"),'ERROR: '+err)
        });
    });

//--------------------------Admin---------------------------//
$("#assignTaskBtn").addEventListener("click",()=>{
    assign()
})

function assign(){
    let task=$("#taskInput").value;
    let selectedMembers = Array.from(document.querySelectorAll('.dropdown-option input:checked')).map(el => el.value);
    
    if (!task || selectedMembers.length==0){
        showError($("#loggedin_error"),"Please enter a task and select atleast a member.")
        return
    };
    
    let day=document.querySelector(".day_btn.active").dataset.day;
    let doc = {
        task:task,
        members:selectedMembers
    };
    let ls=JSON.parse(localStorage.room_mates);
    if(ls.schedule) ls.schedule[day].push(doc)
    else {
        ls.schedule = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].reduce((acc, day) => {
        acc[day] = []; return acc;},{});
        ls.schedule[day].push(doc)
    };
    localStorage.room_mates=JSON.stringify(ls);

    dom_task_adder(day,doc);
    
    if (get_today()==day){
        today_task_adder(doc)
    }
    showError($("#loggedin_error")," ");
}   

// takes day,doc={task:task, members:[]}
function dom_task_adder(day,doc){
    let taskContainer = $("#"+day+"_tasks")

    //the main task div
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';

    //the task description span
    const taskDescriptionSpan = document.createElement('span');
    taskDescriptionSpan.className = 'task_description';
    taskDescriptionSpan.textContent = doc.task;
    taskDiv.appendChild(taskDescriptionSpan);

    //the assigned member span
    const assignedMemberSpan = document.createElement('span');
    assignedMemberSpan.className = 'assigned_member';

    // List of members
    const members = doc.members;

    // Loop through the members and create a span for each
    members.forEach(member => {
        const memberSpan = document.createElement('span');
        memberSpan.textContent = member;
        assignedMemberSpan.appendChild(memberSpan);
    });

    //delete task btn
    let delete_btn=document.createElement("button");
    delete_btn.classList="delete_task_btn"
    delete_btn.innerHTML='<img src="images/delete_icon.png">';
    delete_btn.addEventListener("click",function(){
        //to remove the DOM element
        let task_container=this.parentNode

        //to remove it from the local Storage
        let day=document.querySelector(".day_btn.active").dataset.day;
        let taskContainers = task_container.parentNode.children;
        let index=Array.prototype.indexOf.call(taskContainers, task_container);
        console.log(index);
        let roomMates = JSON.parse(localStorage.room_mates);
        // Check if the index is found and day exists in the schedule
        
        roomMates.schedule[day].splice(index, 1);  // Also specify the number of items to remove
        localStorage.room_mates = JSON.stringify(roomMates);  // Save the updated data back to local storage
        
        
        task_container.remove();  
    })
    // Append the assigned members span to the task div
    taskDiv.appendChild(assignedMemberSpan);
    taskDiv.appendChild(delete_btn);
    
    // Append the task div to the document body or another element in the DOM
    taskContainer.appendChild(taskDiv);
}

function finalize(){
    //from line 488
    let roomMates=JSON.parse(localStorage.room_mates)
    let data={
        userId:$("#user_id").innerText,
        authToken:roomMates.token,
        groupId:$("#group_id").innerText,
        schedule:roomMates.schedule
    }
    fetch('/user/admin/updateSchedule', {
        method: 'PATCH',  
        headers: {
            'Content-Type': 'application/json'  
        },
        body: JSON.stringify(data)  
        })
    .then(response => response.json())  
    .then(doc => {
        if (doc.error) {
            if (doc.error=="Invalid Token" || doc.error=="Unauthorized Access!!!"){
                $("#logout").click();
                logged_out();
                showError($("#signin_error"),doc.error);
            } else {
            showError($("#loggedin_error"),doc.error);
            }
        }
        else {
            $("#loggedin_error").innerText="";
            alert("Schedule has been updated.");
        }
    })
    .catch(error=>{
        showError($("#loggedin_error"),error)
    });
    
}

// -------------------------Register-------------------------- //

join_btn.addEventListener("click",()=>{
    let rPassword= inputFields.signin_dashboard_fields.register_section_fields.password;
    let rName= inputFields.signin_dashboard_fields.register_section_fields.name;
    let rEmail= inputFields.signin_dashboard_fields.register_section_fields.email;
    
    if(!rName.checkValidity() || !rEmail.checkValidity() || !rPassword.checkValidity()){
        showError($("#signin_error"),'Fields cannot be empty and email must contain ( @ and . )');
        return;
    };

    var data = {
        password:rPassword.value,
        name:rName.value,
        email: rEmail.value.toLowerCase()
    };

    fetch('/users/register', 
            {   method: 'POST',   
                headers: { 'Content-Type': 'application/json' },   
                body: JSON.stringify(data) 
            }) 
        .then(r=>r.json())
        .then(doc =>{
            if (doc.error) {
                reset_fields(inputFields.signin_dashboard_fields.register_section_fields);
                showError($("#signin_error"),doc.error);
            }
            else {

                let roomMates=JSON.parse(localStorage.room_mates);
                roomMates.status='loggedIn'
                roomMates.token=doc.authToken
                localStorage.room_mates=JSON.stringify(roomMates);

                reset_fields(inputFields.signin_dashboard_fields.register_section_fields);
                //needs functionality here ????????????
                dashboard_swap(signin_dashboard,loggedin_dashboard);
                dashboard_swap(register_section,login_section);
                load_loggedin_dashboards(doc);
            }
        })
        .catch(err=>{
            reset_fields(inputFields.signin_dashboard_fields.register_section_fields);
            showError($("#signin_error"),'ERROR: '+err)
        });
})

function dashboard_swap(to_hide,to_visible){
    to_hide.classList.toggle("hidden");
    to_visible.classList.toggle("hidden");
};

function load_loggedin_dashboards(doc){
    // groups section
    load_account(doc);
    if (!doc.groupId) {
        $("#menu").classList.add("hidden");
        $("#mates_container").classList.add("hidden");
        load_group_not_found();
    } else {
        // account section 
        if (doc.admin){
            add_edit_btn()
            load_admin_panel({members:doc.members,schedule:doc.schedule})

            let schedule=doc.schedule
            for (let day in schedule) {
                schedule[day].forEach( task =>{
                    dom_task_adder(day,task)
                });
            }
            let roomMates=JSON.parse(localStorage.room_mates)
            roomMates.schedule=schedule
            localStorage.room_mates=JSON.stringify(roomMates)
        }
        load_group_found(doc)
        //today section
        if (doc.schedule){
            load_today(doc.schedule)
            load_schedule(doc.schedule,doc.members)
        }
    }
}

function load_today(schedule){
    const dayName = get_today()

    const todaysTasks = schedule[dayName];

    todaysTasks.forEach(task => {
        if (task) today_task_adder(task)
    });
}

function load_schedule(schedule, members) {
    let memberButtonsContainer = $("#memberBtnContainer")
    let tasksContainer = $("#taskContent");

    members.forEach(member =>{
        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //there is a bug here, instead of using name for button id, userid should be used to as it is unique and contains no spaces
        //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        let memberBtn = document.createElement('button');
        memberBtn.innerText = member;
        memberBtn.id = member+"Btn";
        memberBtn.classList.add("section_btn");
        memberBtn.classList.add("member_btn");
        memberBtn.classList.add("above_menu");
        memberButtonsContainer.appendChild(memberBtn);

        // event listener is added in btns after DOM content loaded, scroll to the end

        let taskContainer=document.createElement("div");
        taskContainer.classList=("tasks_schedule hidden");
        taskContainer.id=member+"_tasks"
        tasksContainer.appendChild(taskContainer);

        for (let day in schedule) {
            let tasksDiv=document.createElement("div");
            tasksDiv.classList.add("day_task_container");
            tasksDiv.id=day+"TaskContainer"

            let taskDay=document.createElement("span");
            taskDay.textContent = `${day.charAt(0).toUpperCase() + day.slice(1)}`;
            taskDay.classList.add("day_schedule");
            tasksDiv.appendChild(taskDay)
            
            let tasksContainer=document.createElement("div");
            tasksContainer.classList.add("day_tasks");
            tasksContainer.id=member+day+"Tasks";
            tasksDiv.appendChild(tasksContainer);

            taskContainer.appendChild(tasksDiv);
        }
    });

    for (let day in schedule) {
        schedule[day].forEach(task => {
            task.members.forEach( member => {

                let memberTasksContainer=$("#"+member+day+"Tasks");

                let taskDescription=document.createElement("span");
                taskDescription.innerHTML=task.task;
                taskDescription.classList.add("description_task_schedule");
                memberTasksContainer.appendChild(taskDescription);
            });
        });
    };

    const member_btns = document.querySelectorAll('.member_btn');

    member_btns.forEach((button, idx, arr) => {
        button.addEventListener('click', function() {
            arr.forEach(btn => btn.classList.remove('active')); // Removes active class from all
            button.classList.add('active'); // Adds active class to the clicked button

            //switch the tasks container according to day when clicked
            hide_items_of_class("tasks_schedule")
            let member_clicked=document.querySelector(".member_btn.active").innerHTML
            $("#"+member_clicked+"_tasks").classList.remove("hidden")
        });
    });

    $("#"+members[0]+"_tasks").classList.remove("hidden");
    $("#"+members[0]+"Btn").classList.add("active");
}

function get_today(){
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    return days[today.getDay()];
}
function today_task_adder(task){
    const taskElement = document.createElement('div');
        taskElement.className = 'task';

        const descriptionSpan = document.createElement('span');
        descriptionSpan.className = 'task_description';
        descriptionSpan.textContent = task.task;
        taskElement.appendChild(descriptionSpan);

        //the assigned member span
        let assignedMemberSpan = document.createElement('span');
        assignedMemberSpan.className = 'assigned_member';

        // List of members
        let members = task.members;

        // Loop through the members and create a span for each
        members.forEach(member => {
            let memberSpan = document.createElement('span');
            memberSpan.textContent = member;
            assignedMemberSpan.appendChild(memberSpan);
        });
        taskElement.appendChild(assignedMemberSpan)

        $(".today_container").appendChild(taskElement);
}
function load_group_not_found(){
    user_name=$("#account_name").value
    header=document.createElement("h2")
    header.innerText="Join or Create a group"
    group_id_field=document.createElement('input');
    group_id_field.id="group_id_field";
    group_id_field.placeholder="Group Id";
    group_id_field.classList.add("user_input_field");
    $("#no_group").appendChild(group_id_field);
    
    join_btn=document.createElement('button');
    join_btn.id="join_btn";
    join_btn.innerText="Join";
    join_btn.classList.add('btn');
    join_btn.classList.add('section_btn');
    $("#no_group").appendChild(join_btn);
    join_btn.addEventListener("click",join_group)
    
    create_btn=document.createElement('button');
    create_btn.id="create_btn";
    create_btn.innerText="Create";
    create_btn.classList.add('btn');
    create_btn.classList.add('section_btn');
    
    $("#no_group").appendChild(create_btn);  
    create_btn.addEventListener("click",create_group)

    let no_group_logout_btn=document.createElement('button');
    no_group_logout_btn.id="no_group_logout_btn";
    no_group_logout_btn.innerText="Log Out";
    no_group_logout_btn.classList.add('btn');
    no_group_logout_btn.classList.add('section_btn');
    
    $("#no_group").appendChild(no_group_logout_btn);  
    no_group_logout_btn.addEventListener("click", ()=>{
        logout()
        $("#menu").classList.remove("hidden");
        $("#mates_container").classList.remove("hidden");
    })

    open("groups");
    message_popup("Hello "+user_name+".\n\nPlease join a group or create one.\nThere is no fun in being alone in a group.\nYou can create a new group if you want.\n     OR\nEnter a group ID to join existing group.\n\nThank you!")
}
function add_edit_btn(){
    const editBtn = document.createElement('button');
    editBtn.id = 'edit_btn';
    editBtn.className = 'edit_btn menu_btn btn not_visible';
    editBtn.innerHTML = '<img class="menu_img" style="opacity: 0.6; transform: translate(-0.05em, -0.05em);" src="images/edit_icon.webp">';
    const groupsBtn = document.getElementById('groups_btn');
    groupsBtn.parentNode.insertBefore(editBtn, groupsBtn.nextSibling);

    editBtn.addEventListener("click",()=> edit())
}
function load_group_found(doc){
    container=$("#mates_container");

    group_id=document.createElement("h2");
    group_id.innerHTML="Group ID: <span id='group_id'>"+doc.groupId+"</span>";
    container.appendChild(group_id);
    
    title=document.createElement("h1");
    title.innerText="Members";
    container.appendChild(title);

    button=document.createElement("button");
    button.id="leave_group_btn";
    button.classList.add("btn");
    button.classList.add("section_btn");
    button.classList.add("delete_btn");
    button.innerText="Leave";
    container.appendChild(button);

    let i=1
    doc.members.forEach(memberName => {
        div=document.createElement("div");
        div.classList.add("member_name");
        div.id="member"+i;
        i++;
        div.innerText=memberName;
        container.appendChild(div);
    });

    button.addEventListener("click",()=>leave_group({groupId:doc.groupId,userId:doc.userId}))
}

function load_account(doc){
    $("#account_name").value=doc.name;
    $("#account_email").value=doc.email;
    $("#user_id").innerText=doc.userId;
}
function showError(container,error){
    container.innerText=error;
};

function reset_fields(fields){
    Object.entries(fields).map(entry => {
        let field=entry[1];
        field.value=""
    })
    showError($("#signin_error"),"")
    showError($("#loggedin_error"),"")
}

function logged_out(){
    let roomMates=JSON.parse(localStorage.room_mates);
    roomMates.status= 'loggedOut';
    localStorage.room_mates=JSON.stringify(roomMates);
}

function message_popup(message){
    container=document.createElement("div");
    container.classList.add("section")
    container.id="message"
    
    message_container=document.createElement("span");
    message_container.innerText=message;

    button=document.createElement("button");
    button.id="close_message_btn";
    button.classList.add("btn");

    close_image=document.createElement("img");
    close_image.classList.add("menu_img");
    close_image.src="images/close.png";

    $("#loggedin_dashboard").style="filter: blur(5px);"
    $("#main").appendChild(container);
    container.appendChild(button);
    container.appendChild(message_container);
    button.appendChild(close_image); 

    $("#close_message_btn").addEventListener("click",()=>{
        $("#main").removeChild($("#message"));
        $("#loggedin_dashboard").style.filter="None";
    })
}

function clear_loggedin_sections(){
    // for group section
    remove_all_child($("#mates_container"));
    remove_all_child($("#no_group"));
    //for account section
    load_account({userId:"",email:"",name:""});
}

function edit(){
    open("edit")
}

function load_admin_panel(doc){
    doc.members.forEach(member_name => {
        add_member(member_name)
    });
    function add_member(name){
        label=document.createElement('label');
        label.classList.add("dropdown-option")
        label.innerHTML="<input type='checkbox' value="+name+" /> <span>"+ name+"</span></label>";
        $("#select_member").appendChild(label)
    }
}
//-------------------------------------------------local storage-------------------------------------------

// initial loading of page --- clear previous data in local storage and load the saved theme
(function () { 
    if (!localStorage.room_mates){
        let roomMates={
            status:'loggedOut',
            theme:'light'
        }
        localStorage.room_mates=JSON.stringify(roomMates);
    } else {
        roomMates=JSON.parse(localStorage.room_mates);
        delete localStorage.room_mates

        if (roomMates.theme){
            if (roomMates.theme === 'dark') {
                $(':root').setAttribute('dark',true);
                document.getElementById('theme-toggle').checked=true; 
            }
        } else {
            roomMates.theme='light';
            document.getElementById('theme-toggle').checked=false; 
        }
        localStorage.room_mates=JSON.stringify({
            status:'loggedOut',
            theme:roomMates.theme
        });
    };
}) ();


document.addEventListener("DOMContentLoaded", function() {

    //---------------------------home panel-----------
    //Home section
    $("#calendar_btn").addEventListener("click",()=>{
        schedule_section=$("#schedule")
        today_section=$("#today")

        dashboard_swap(today_section,schedule_section)
        dashboard_swap($("#calendar_btn"),$("#today_btn"))

        schedule_section.style.transform="translate(0,0)"
        today_section.style.transform="translate(-100vw,0)"
    })
    $("#today_btn").addEventListener("click",()=>{
        schedule_section=$("#schedule")
        today_section=$("#today")

        dashboard_swap(schedule_section,today_section)
        dashboard_swap($("#today_btn"),$("#calendar_btn"))

        today_section.style.transform="translate(0,0)"
        schedule_section.style.transform="translate(100vw,0)"
    })

    // --------------------------admin panel----------------------

    const buttons = document.querySelectorAll('.day_btn');

    buttons.forEach((button, idx, arr) => {
        button.addEventListener('click', function() {
            arr.forEach(btn => btn.classList.remove('active')); // Removes active class from all
            button.classList.add('active'); // Adds active class to the clicked button

            //switch the tasks container according to day when clicked
            hide_items_of_class("tasks")
            let day_clicked=document.querySelector(".day_btn.active").dataset.day
            $("#"+day_clicked+"_tasks").classList.remove("hidden")
        });
    });

    const dropdown = document.querySelector('.custom-dropdown');
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const menu = dropdown.querySelector('.dropdown-menu');

    // Opens the dropdown menu on mouse enter
    toggle.addEventListener('mouseenter', function() {
        menu.style.display = 'flex';
    });

    // Closes the dropdown menu when the mouse leaves the dropdown area
    dropdown.addEventListener('mouseleave', function() {
        menu.style.display = 'none';
    });

    $("#finalize_btn").addEventListener("click",()=> {
        if(!confirm("Are you sure you want to update the schedule?")) return;
        finalize(); //line 152
    })
     // ----------------enabeling pointer events just for toggle menu btn----
    $("#menu_toggle").style.pointerEvents='all';
    
});