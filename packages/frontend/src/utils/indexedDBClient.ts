const dbName = 'imageDatabase';
const storeName = 'images';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(storeName);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('Database error: ' + event.target.errorCode);
        };
    });
}

// Store the image file in IndexedDB
async function storeImage(file: File) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.put(file, file.name); // Using 'myImage' as the key

        request.onsuccess = () => resolve('Image stored successfully');
        request.onerror = (event) => reject('Store error: ' + event.target.errorCode);
    });
}

// Retrieve the image file from IndexedDB and create an object URL
async function getImageUrl(key) {
    const db = await openDatabase();
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = store.get(key);

        request.onsuccess = (event) => {
            const file = event.target.result;
            if (file) {
                const url = URL.createObjectURL(file);
                resolve(url);
            } else {
                reject('Image not found');
            }
        };

        request.onerror = (event) => reject('Retrieve error: ' + event.target.errorCode);
    });
}

export { storeImage, getImageUrl };