export const generateID = () => {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 12).padStart(12, "0")
  );
};

export const clone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};


export const getProjectId = () => {
  console.log("Fetching project id: "+(document.getElementsByClassName("c-current-project")[0].dataset['projectId']));
  return (document.getElementsByClassName("c-current-project")[0].dataset['projectId'])
}