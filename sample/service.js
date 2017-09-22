export const getUserSuggestions = (displayName = '') => {
    return fetch(`http://localhost:8080/?username=${displayName.slice(1)}`, {
        method: 'GET',
        headers: {
            "Content-type": "application/json"
        }
    })
        .then((res) => {
            console.log(res);
            if (!res.ok) {
                throw new Error("Went wrong");
            }
            return res.json();
        })
};