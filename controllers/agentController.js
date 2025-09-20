
const Evaluation = require("../models/Evaluation");
const getLowRatingCalls = async (req, res) => {
  try {
    const agents = await Evaluation.find({
      rating: { $lt: 40 },   // filter rating less than 40
      mod: "Call"            // filter mod as "Call"
    });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getLowRatingChats = async (req, res) => {
  try {
    const agents = await Evaluation.find({
      rating: { $lt: 40 },   // filter rating less than 40
      mod: "Chat"   
             
    });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// const getLowRatingCalls = async (req, res) => {
//   try {
//     const { agentName } = req.query;

//     // Build query
//     let query = {
//       rating: { $lt: 40 },
//       mod: "Call"
//     };

//     if (agentName) {
//       query.agentName = agentName; // match agentName if provided
//     }

//     const agents = await Evaluation.find(query);

//     res.status(200).json({
//       success: true,
//       count: agents.length,
//       data: agents
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

module.exports = { getLowRatingCalls, getLowRatingChats };
