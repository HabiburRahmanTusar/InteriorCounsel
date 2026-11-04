const Project = require('../models/Project');

exports.listProjects = async (filter = {}) => {
  const query = {};
  if (filter.status && filter.status !== 'All' && filter.status !== 'All Status') {
    query.status = filter.status;
  }
  if (filter.type && filter.type !== 'All' && filter.type !== 'All Types') {
    query.type = filter.type;
  }
  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: 'i' } },
      { customer: { $regex: filter.search, $options: 'i' } },
      { projectId: { $regex: filter.search, $options: 'i' } },
      { loc: { $regex: filter.search, $options: 'i' } },
    ];
  }

  return Project.find(query).sort({ createdAt: -1 });
};

exports.getProjectById = async (id) => {
  const project = await Project.findOne({
    $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { projectId: id }],
  });
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return project;
};

exports.createProject = async (data) => {
  const project = new Project(data);
  return project.save();
};

exports.updateProject = async (id, data) => {
  const project = await exports.getProjectById(id);
  Object.assign(project, data);
  return project.save();
};

exports.deleteProject = async (id) => {
  const project = await exports.getProjectById(id);
  await project.deleteOne();
  return { id: project._id, projectId: project.projectId };
};

