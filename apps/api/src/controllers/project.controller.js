const projectService = require('../services/project.service');
const apiResponse = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try {
    const projects = await projectService.listProjects(req.query);
    return apiResponse.ok(res, projects);
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    return apiResponse.ok(res, project);
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body);
    return apiResponse.created(res, project, 'Project created successfully');
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    return apiResponse.ok(res, project, 'Project updated successfully');
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id);
    return apiResponse.ok(res, result, 'Project deleted successfully');
  } catch (err) {
    return next(err);
  }
};

