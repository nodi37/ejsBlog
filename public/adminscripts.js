//ADD SIDE

var choosenTags = [];

function tagHandler(option, index) {
    const selectmenu = document.getElementById("tag");

    switch (option) {
        case 1: //add
            const toWorkWith = selectmenu.value;
            selectmenu.value = "default";
            choosenTags.push(toWorkWith);

            for (i = 0; i < selectmenu.length; i++) {
                if (selectmenu.options[i].value == toWorkWith) {
                    selectmenu.remove(i);
                }
            }
            break;
        case 2: //remove
            const newopt = selectmenu.length;

            selectmenu.options[newopt] = new Option(choosenTags[index], choosenTags[index], false, false);
            choosenTags.splice(index, 1);
            break;
        default:
    }

    const tagList = document.getElementById("selectedtags");

    var tagListArray = [];
    choosenTags.forEach((tag, index) => {
        tagListArray.push(' <p>' + tag + '</p><button type="button" onclick="tagHandler(2,' + index +
            ')">Usuń</button>');
    });

    if (tagListArray.length > 0) {
        tagList.innerHTML = "Wybrane tagi: " + tagListArray;
    } else {
        tagList.innerHTML = "";
    }
}


function saveDraft() {

    const delta = JSON.stringify(quill.getContents());
    const autosave = document.getElementById("autosave");
    const sponsored = document.getElementById("sponsored").checked;
    const photo = document.getElementById("image-file").files;
    const body = Object.fromEntries(new FormData(document.getElementById("newPost")));
    const {
        title,
        post,
        x
    } = body;

    const data = {
        title: title,
        post: delta,
        tags: JSON.stringify(choosenTags),
        sponsored: sponsored,
        withPhoto: photo.length
    }

    autosave.innerHTML = "Ładuje";

    if (title.length > 0 || delta.length > 28 || photo.length > 0) {
        $.ajax({
            url: '/admin/add',
            type: 'POST',
            data: data
        }).done(async function (response) {
            if (response.status === 201) {
                if (photo.length > 0) {
                    let photo = await addPhoto(response.id);
                    alert("Zdjęcie: " + photo.statusText + " Zapisano, przejdź do sekcji post aby opublikować");

                } else {
                    alert("Zapisano. Dodaj zdjęcie przed publikacją");
                };

            } else {
                alert("Wystąpił błąd: " + response);
            }
        });
    } else {
        autosave.innerHTML =
            "Wystąpił błąd: conajmniej jedno z pól zdjęcie, tytuł lub treść musi zawierać jakąś wartość.";
    }
}

function addPhoto(id) {
    return new Promise((resolve, reject) => {
        const photo = document.getElementById("image-file").files[0];
        const formData = new FormData();
        formData.append("photo", photo);
        formData.append("name", id)
        fetch('/admin/add/img', {
            method: "POST",
            body: formData
        }).then(function (response) {
            console.log(response)
            resolve(response);
        }).catch(function (err) {
            console.log(`Error: ${err}`)
            reject(err);
        });;
    })

}

var imageHandler = function (image, callback) {
    var formData = new FormData();
    formData.append('image', image, image.name);

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/xd', true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            callback(xhr.responseText);
        }
    };
    xhr.send(formData);
};


//ADD SIDE END
// DRAFTS

function remove(id) {
    if (confirm("Jestes pewny że chcesz usunąć ten post? Publikacja również zostanie cofnięta.")) {
        $.ajax({
            url: '/admin/drafts',
            type: 'DELETE',
            data: {
                id: id
            }
        }).done(function (response) {
            if (!alert(response)) {
                location.reload();
            };

        })
    }
}


function updateDraft(id) {
    const delta = JSON.stringify(quill.getContents());
    const autosave = document.getElementById("autosave");
    const sponsored = document.getElementById("sponsored").checked;
    const photo = document.getElementById("image-file").files;
    const body = Object.fromEntries(new FormData(document.getElementById("newPost")));
    const {
        title,
        post,
        x
    } = body;

    const data = {
        id: id,
        title: title,
        post: delta,
        tags: JSON.stringify(choosenTags),
        sponsored: sponsored,
        withPhoto: photo.length
    }

    autosave.innerHTML = "Ładuje";

    if (title.length > 0 || post.length > 0 || photo.length > 0) {
        $.ajax({
            url: '/admin/edit',
            type: 'PATCH',
            data: data
        }).done(function (response) {
            if (response === "OK") {
                if (photo.length > 0) {
                    addPhoto(id);
                    autosave.innerHTML = "Zapisano, przejdź do sekcji post aby opublikować";

                } else {
                    autosave.innerHTML = "Zapisano.";
                };

            } else {
                autosave.innerHTML = "Wystąpił błąd: " + response;
            }
        });
    } else {
        autosave.innerHTML =
            "Wystąpił błąd: conajmniej jedno z pól zdjęcie, tytuł lub treść musi zawierać jakąś wartość.";
    }

}

function publish(id) {
    if (confirm("Jestes pewny że chcesz opublikować ten post?")) {
        const info = document.getElementById(id);
        $.ajax({
            url: '/admin/publish',
            type: 'POST',
            data: {
                id: id,
            }
        }).done(function (response) {
            if (response === "OK") {
                if (!alert("Opublikowano")) {
                    location.reload()
                }
            } else {
                info.innerHTML = "Błąd: " + response + ". Sprawdź czy post na pewno ma uzupełniony tytuł oraz treść oraz dodane zdjęcie i spróbuj ponownie."

            }
        });
    }

}

function unpublish(id) {
    if (confirm("Jestes pewny że chcesz cofnąć publikacje tego postu?")) {
        const info = document.getElementById(id);
        $.ajax({
            url: '/admin/unpublish',
            type: 'POST',
            data: {
                id: id
            }
        }).done(function (response) {
            if (response === "OK") {
                if (!alert("Publikacja została cofnięta")) {
                    location.reload()
                }

            } else {
                info.innerHTML = "Błąd: " + response
                info.style.backgroundColor = "red"
            }
        });
    }
}

function onTime(id) {

    console.log("Im working")

    const cls = document.getElementsByClassName(id);
    const date = cls[0].childNodes[1].value;
    const time = cls[0].childNodes[3].value;
    const checked = cls[0].childNodes[5].checked;
    const pubDate = new Date(date + " " + time)
    const tDate = new Date();
    const info = document.getElementById(id);
    var onDate = false;

    if (checked) {
        onDate = true
    }

    if (pubDate > tDate && !isNaN(pubDate.getDate())) {
        const dateToSend = pubDate.toISOString()
        $.ajax({
            url: '/admin/date',
            type: 'POST',
            data: {
                id: id,
                date: dateToSend,
                onDate: onDate
            }
        }).done(function (response) {
            if (response === "OK") {
                location.reload()
            } else {
                info.innerHTML = "Błąd: " + response
                info.style.backgroundColor = "red"
            }
        });
    } else {
        info.innerHTML = "Zła data!";
        cls[0].childNodes[5].checked = false;
    }

}

function isEmpty() {
    const form = document.getElementById("tagform");
    const input = document.getElementById("tag").value;
    const inf = document.getElementById("inf");
    if (input.length < 1 || input.indexOf(" ") > 0) {
        inf.innerHTML = "Tag musi posiadać conajmniej 1 znak i nie może zawierać spacji"
    } else {
        form.submit();
    }
}

function removeTag(id) {
    const inf = document.getElementById("inf");
    if (confirm("Czy napewno chcesz usunąć ten Tag?")) {
        $.ajax({
            url: '/admin/tag',
            type: 'POST',
            data: {
                id: id
            }
        }).done(function (response) {
            if (response === "OK") {
                location.reload()
            } else {
                inf.innerHTML = "Błąd usuwania taga"
            }
        });
    }
}