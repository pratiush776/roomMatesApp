$("#menu_toggle").addEventListener("click", function() {
    $("#menu_toggle").classList.toggle("isActive")
    const obj = document.getElementsByClassName("menu_btn");
    Array.from(obj).forEach(element => {
        element.classList.toggle("not_visible");
    });
});

$("#home_btn").addEventListener("click", () => {
    $("#home").classList.remove("hidden");
    hide_items_of_class("menu_section");
    showError($("#loggedin_error"),"")
    current_swap("home");
})

$("#groups_btn").addEventListener("click", () => open("groups"))

$("#settings_btn").addEventListener("click", () => open("settings"))

$("#account_btn").addEventListener("click", ()=>open("account"))

function open(section){
    $("#home").classList.add("hidden");
    hide_items_of_class("menu_section");
    $("#"+section).classList.remove("hidden");
    showError($("#loggedin_error"),"")
    current_swap(section);
}

// update information (name and email)--------
$('#update_info_btn').addEventListener("click",()=>{
    showError($("#loggedin_error"),"")
    // check to make sure no fields aren't blank
    if(!$('#account_name').checkValidity() || !$('#account_email').checkValidity()){
        showError($("#loggedin_error"),'Fields cannot be empty and email must contain ( @ and . )');
        return;
    }
    // bundling all data
    var data = {
        userId:$('#user_id').innerText,
        name: $('#account_name').value,
        email: $('#account_email').value,
        authToken:JSON.parse(localStorage.room_mates).token,
    };

    fetch('/user/update_info', 
        {   method: 'PATCH',   
        headers: { 'Content-Type': 'application/json' },   
        body: JSON.stringify( data ) 
    }) 
        .then(r=>r.json()) 
        .then(doc => {
            if (doc.error) {
                if (doc.error=="Invalid Token"){
                    $("#logout").click();
                    logged_out();
                } else{
                showError($("#loggedin_error"),doc.error);
                }
            }
            else alert("Your name and email have been updated.")
        })
        .catch(err=>showError('ERROR: '+err));
    });

//------------ change password ----------
$("#change_password_btn").addEventListener("click", () => {
    showError($("#loggedin_error"),"")
    reset_fields(inputFields.loggedin_dashboard.account_fields_pass);

    $("#change_password_btn").classList.toggle("active");
    $("#old_password").classList.toggle("hidden");
    $("#new_password").classList.toggle("hidden");
    $("#confirm_change_password_btn").classList.toggle("not_visible");
})

$("#confirm_change_password_btn").addEventListener("click",()=>{
    showError($("#loggedin_error"),"");
    // check to make sure no fields aren't blank
    if(!$('#old_password').checkValidity() || !$('#new_password').checkValidity()){
        showError($("#loggedin_error"),'Fill all the blanks');
        return;
    } else if ($('#old_password').value === $('#new_password').value){
        showError($("#loggedin_error"),'Passwords must be different');
        return;
    }
    // bundling all data
    var data = {
        email: $('#account_email').value,
        oldPass: $('#old_password').value,
        newPass: $('#new_password').value,
        authToken:JSON.parse(localStorage.room_mates).token,
    };

    fetch('/user/update_password', 
        {   method: 'PATCH',   
        headers: { 'Content-Type': 'application/json' },   
        body: JSON.stringify( data ) 
    }) 
        .then(r=>r.json()) 
        .then(doc => {
            if (doc.error) {
                if (doc.error=="Invalid Token"){
                    $("#logout").click();
                    logged_out();
                    showError($("#signin_error"),doc.error);
                } else{
                showError($("#loggedin_error"),doc.error);
                }
            }
            else {
                $("#loggedin_error").innerText="";
                $("#change_password_btn").click();
                alert("Password has been updated.");
            }
        })
        .catch(err=>showError('ERROR: '+err));
});

$("#delete_account_btn").addEventListener("click",()=>{
    showError($("#loggedin_error"),"");
    if(!confirm("Are you sure you want to delete your profile?"))
        return;
    fetch('/user/delete/'+$('#user_id').innerText+'/'+JSON.parse(localStorage.room_mates).token, 
    {method: 'DELETE' }) 
    .then(r=>r.json()) 
    .then(doc => {
        if (doc.error) {
            if (doc.error=="Invalid Token"){
            $("#logout").click();
            logged_out();
            showError($("#signin_error"),doc.error)
            }
            showError($("#loggedin_error"),doc.error)
        }
        else {
            logged_out();
            $("#logout").click();
            alert("Success");
        }
    })
    .catch(err=>showError('ERROR: '+err));
})
// ---------------------------my account--------------------------------------------------------

function create_group(){
    userId=$("#user_id").innerText;
    lS=JSON.parse(localStorage.room_mates)
    fetch("user/create_group",{
        method: 'POST',  
        headers: {
            'Content-Type': 'application/json'  
        },
        body: JSON.stringify({
            userId:userId,
            authToken:lS.token
        })  
    })
    .then(response => response.json())  
    .then(doc => {
        remove_all_child($("#no_group"));
        load_group_found(doc);
        add_edit_btn();
        return; 
    })
    .catch(err=>{
        showError($("#loggedin_error"),'ERROR: '+err)
    });
}

function join_group(doc){
    groupId=$("#group_id_field").value

    if(!groupId){
        showError($("#loggedin_error"),"Please provide a group ID to join!");
        return;
    }
    showError($("#loggedin_error"),"");
    userId=$("#user_id").innerText;
    lS=JSON.parse(localStorage.room_mates)
    fetch("user/join",{
        method: 'POST',  
        headers: {
            'Content-Type': 'application/json'  
        },
        body: JSON.stringify({
            userId:userId,
            authToken:lS.token,
            groupId:groupId
        })  
    })
    .then(response => response.json())  
    .then(doc => {
        if (doc.status=="success") {
            // console.log(doc)
            // remove_all_child($("#no_group"));
            // load_group_found(doc);
            $("#logout").click();
            logged_out();
            let roomMates=JSON.parse(localStorage.room_mates);
            roomMates.status='loggedIn'
            roomMates.token=doc.authToken
            localStorage.room_mates=JSON.stringify(roomMates);
            reset_fields(inputFields.signin_dashboard_fields.login_section_fields);
            dashboard_swap(signin_dashboard,loggedin_dashboard);
            load_loggedin_dashboards(doc);
            return; 
        } else if (doc.error){
            showError($("#loggedin_error"),doc.error)
        } 
    })
    .catch(err=>{
        showError($("#loggedin_error"),'ERROR: '+err)
    });
}

function leave_group(doc){
    showError($("#loggedin_error"),"");
    if(!confirm("Are you sure you want to leave this group?"))
        return;
    fetch('/user/leave/'+$("#user_id").innerText+'/'+$("#group_id").innerText+'/'+JSON.parse(localStorage.room_mates).token, 
    {method: 'DELETE' }) 
    .then(r=>r.json()) 
    .then(doc => {
        if (doc.error) {
            if (doc.error=="Invalid Token"){
            $("#logout").click();
            logged_out();
            showError($("#signin_error"),doc.error)
            }
            showError($("#loggedin_error"),doc.error)
        }
        else{
            alert("Success");
            remove_all_child($("#mates_container"));
            load_group_not_found();
        } 
    })
    .catch(err=>showError('ERROR: '+err));
}
// ---------------------------settings--------------------------------------------------------
document.getElementById('theme-toggle').addEventListener('change', function() {
    if(this.checked) {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
        document.body.classList.remove('dark-mode');
    }
    toggleMode();
});
//--------------------------------------------Theme Mode----------------------------------------------------
function toggleMode(){
    roomMates=JSON.parse(localStorage.room_mates)
    if($(':root').hasAttribute('dark')){
        roomMates.theme='light';
        $(':root').removeAttribute('dark');
    }else{
        roomMates.theme='dark';
        $(':root').setAttribute('dark',true);
    }
    localStorage.room_mates=JSON.stringify(roomMates)
};
// ---------------------------message box-------------------------------------------------------

//----------------------------------------------------------------------------------------------
function current_swap(to){
    let roomMates=JSON.parse(localStorage.room_mates);
    roomMates.current=to;
    localStorage.room_mates=JSON.stringify(roomMates);
}

function hide_items_of_class(className){
    obj=document.getElementsByClassName(className)
    Array.from(obj).forEach(element => {
        element.classList.add("hidden");
    });
}

function remove_all_child(parent){
    while (parent.firstChild) {
    parent.removeChild(parent.lastChild);
  }
}
