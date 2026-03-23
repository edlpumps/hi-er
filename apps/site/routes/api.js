const express = require("express");
const lang = require("../utils/language");
const svg_builder = require("../utils/label_builder.js");
const aw = require("./async_wrap");

const router = express.Router();

module.exports = router;

router.use((req, res, next) => {
  const languageHeader = req.header("x-label-language");
  if (languageHeader) {
    lang.set_label_language(req, res, languageHeader);
  }
  next();
});

// create a labeling job
router.post("/participant/:participantId/label-job", async (req, res) => {
  try {
    const {participantId} = req.params;
    const jobs = (req.body || []).map((job) => {
      return {
        ...job,
        id: crypto.randomUUID(),
      };
    });

    const participant = await req.Participants.findById(participantId);
    const submittedJobs = [];
    const failedJobs = [];
    for (const job of jobs) {
      const {
        format,
        formatSize,
        extension,
        locale,
        equipmentType,
        submitJob,
        listedOnly,
      } = job;

      const pumps =
        equipmentType === "pump"
          ? await req.Pumps.getAllByParticipantId(participantId, listedOnly)
          : await req.Circulators.getAllByParticipantId(
              participantId,
              listedOnly,
            );

      const labels = pumps.map((pump) => {
        const labelId = pump._id.toString();
        const archiveName = `${pump.rating_id}-(${locale})`;
        return {labelId, archiveName};
      });

      const jobBody = {
        id: crypto.randomUUID(),
        name: `Labeling Job for ${participant.name}`,
        archiveName: `${participant.name}-(${equipmentType})-labels-(${locale})-(${format.replace(/\//g, "-")})${formatSize ? `-(${formatSize})` : ""}`,
        format,
        formatSize,
        extension,
        locale,
        equipmentType,
        swVersion: "production",
        labelsCount: labels.length,
        labels,
      };

      if (submitJob) {
        const response = await fetch(
          `http://localhost:7071/api/participant/${participantId}/label-jobs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(jobBody),
          },
        );
        if (!response.ok) {
          console.error("Failed to submit job:", await response.text());
          failedJobs.push(jobBody);
          continue;
        }
        submittedJobs.push(jobBody);
      }
    }

    return res.json({submitted: submittedJobs, failed: failedJobs});
  } catch (error) {
    console.error("Error adding participant label job:", error);
    res.status(500).json({success: false, message: "Internal Server Error"});
  }
});

// circulator label endpoints
router.get(
  "/participants/:id/circulators/:circulator_id/svg/label",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_label(
      req,
      pump.participant,
      pump,
      res,
    );
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating Label-" +
        pump.rating_id +
        "-(" +
        lang.get_label_language(req, res) +
        ").svg",
    );
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  }),
);
router.get(
  "/participants/:id/circulators/:circulator_id/png/label",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_label(
      req,
      pump.participant,
      pump,
      res,
    );
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating Label-" +
        pump.rating_id +
        "-(" +
        lang.get_label_language(req, res) +
        ").png",
    );
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", png_buffer.length);
    res.status(200).send(png_buffer);
  }),
);
router.get(
  "/participants/:id/circulators/:circulator_id/svg/label/sm",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_label_small(
      req,
      pump.participant,
      pump,
      res,
    );
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating Label (sm) - " +
        pump.rating_id +
        ".svg",
    );
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  }),
);
router.get(
  "/participants/:id/circulators/:circulator_id/png/label/sm",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_label_small(
      req,
      pump.participant,
      pump,
      res,
    );
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating Label (sm) - " +
        pump.rating_id +
        ".png",
    );
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", png_buffer.length);
    res.status(200).send(png_buffer);
  }),
);
router.get(
  "/participants/:id/circulators/:circulator_id/svg/qr",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_qr(
      req,
      pump.participant,
      pump,
      res,
    );
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating QR - " + pump.rating_id + ".svg",
    );
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(svg);
  }),
);
router.get(
  "/participants/:id/circulators/:circulator_id/png/qr",
  aw(async (req, res) => {
    const pump = await req.Circulators.findById(req.params.circulator_id)
      .populate("participant")
      .exec();
    const svg = svg_builder.make_circulator_qr(
      req,
      pump.participant,
      pump,
      res,
    );
    const png_buffer = svg_builder.svg_to_png(svg);
    res.setHeader(
      "Content-disposition",
      "attachment; filename=Energy Rating QR - " + pump.rating_id + ".png",
    );
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Length", png_buffer.length);
    res.status(200).send(png_buffer);
  }),
);

// pump label endpoints
function get_filename(req, res, rating_id, type = "Label") {
  let label_lang = lang.get_label_language(req, res);
  return "Energy Rating " + type + "-" + rating_id + "-(" + label_lang + ")";
}

const render_svg = async (req, res, svg_maker, callback) => {
  try {
    const participant = await req.Participants.findById(
      req.params.participant_id,
    ).exec();
    const pump = await req.Pumps.findById(req.params.id).exec();
    if (!participant || !pump) {
      return callback("Unknown participant");
    }
    var load =
      pump.configuration == "bare" || pump.configuration == "pump_motor"
        ? "CL"
        : "VL";
    req.Labels.findOne()
      .and([
        {
          speed: pump.speed,
        },
        {
          doe: pump.doe,
        },
        {
          load: load,
        },
      ])
      .exec(function (err, label) {
        if (err) return callback(err);
        else
          return callback(null, svg_maker(req, participant, pump, label), pump);
      });
  } catch (ex) {
    return callback(ex);
  }
};

router.get(
  "/participants/:participant_id/pumps/:id/svg/label",
  function (req, res) {
    render_svg(req, res, svg_builder.make_label, function (err, svg, pump) {
      if (err) {
        res.status(500).send(err);
        return;
      }
      res.setHeader(
        "Content-disposition",
        "attachment; filename=" +
          get_filename(req, res, pump.rating_id) +
          ".svg",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svg);
    });
  },
);

router.get(
  "/participants/:participant_id/pumps/:id/svg/label/sm",
  function (req, res) {
    render_svg(req, res, svg_builder.make_sm_label, function (err, svg, pump) {
      if (err) {
        res.status(500).send(err);
        return;
      }
      res.setHeader(
        "Content-disposition",
        "attachment; filename=" +
          get_filename(req, res, pump.rating_id) +
          "-sm.svg",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svg);
    });
  },
);

router.get(
  "/participants/:participant_id/pumps/:id/png/label",
  function (req, res) {
    try {
      render_svg(req, res, svg_builder.make_label, function (err, svg, pump) {
        if (err) {
          res.status(500).send(err);
          return;
        }
        const png_buffer = svg_builder.svg_to_png(svg);
        res.setHeader(
          "Content-disposition",
          "attachment; filename=" +
            get_filename(req, res, pump.rating_id) +
            ".png",
        );
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Length", png_buffer.length);
        res.status(200).send(png_buffer);
      });
    } catch (e) {
      res.status(500).send(e);
    }
  },
);

router.get(
  "/participants/:participant_id/pumps/:id/png/label/sm",
  function (req, res) {
    try {
      render_svg(
        req,
        res,
        svg_builder.make_sm_label,
        function (err, svg, pump) {
          if (err) {
            res.status(500).send(err);
            return;
          }
          const png_buffer = svg_builder.svg_to_png(svg);
          res.setHeader(
            "Content-disposition",
            "attachment; filename=" +
              get_filename(req, res, pump.rating_id) +
              "-sm.png",
          );
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Content-Length", png_buffer.length);
          res.status(200).send(png_buffer);
        },
      );
    } catch (e) {
      res.status(500).send(e);
    }
  },
);

router.get(
  "/participants/:participant_id/pumps/:id/svg/qr",
  function (req, res) {
    render_svg(req, res, svg_builder.make_qr, function (err, svg, pump) {
      if (err) {
        res.status(500).send(err);
        return;
      }
      res.setHeader(
        "Content-disposition",
        "attachment; filename=" +
          get_filename(req, res, pump.rating_id, "QR") +
          ".svg",
      );
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svg);
    });
  },
);

router.get(
  "/participants/:participant_id/pumps/:id/png/qr",
  function (req, res) {
    try {
      render_svg(req, res, svg_builder.make_qr, function (err, svg, pump) {
        if (err) {
          res.status(500).send(err);
          return;
        }
        const png_buffer = svg_builder.svg_to_png(svg);
        res.setHeader(
          "Content-disposition",
          "attachment; filename=" +
            get_filename(req, res, pump.rating_id, "QR") +
            ".png",
        );
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Length", png_buffer.length);
        res.status(200).send(png_buffer);
      });
    } catch (e) {
      res.status(500).send(e);
    }
  },
);
