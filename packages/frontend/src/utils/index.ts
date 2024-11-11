export const getProjectId = () => {
  console.log("Fetching project id: "+(document.getElementsByClassName("c-current-project")[0].dataset['projectId']));
  return (document.getElementsByClassName("c-current-project")[0].dataset['projectId'])
}
