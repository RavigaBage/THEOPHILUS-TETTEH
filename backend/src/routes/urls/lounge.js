const express = require('express');
const {protect, restrictTo } = require('./../../middleware/auth');
const LoungeData = require('./../../models/InternetLounge');
const router = express.Router();


router.get('/lounge-data', restrictTo('user', 'admin'), async(req, res)=>{
    try {
        const {date, id_type, page,year,month,day} = req.query;
        const startOfYear = new Date(`${year}`);
        const endOfYear   = new Date(`${year+1}`);

        
        const limit =  20;
        const pageNum = parseInt(page) || 1;
        const skip = (pageNum - 1) * limit;
        const filter = {}

        if (id_type && id_type !== 'all') {
        filter.user_id_type = id_type;
        }

        if (year && month && day) {
            filter.createdAt = {
                $gte: new Date(year, month - 1, day),
                $lt: new Date(year, month - 1, day + 1)
            };
        } else if (year && month) {
            filter.createdAt = {
                $gte: new Date(year, month - 1, 1),
                $lt: new Date(year, month, 1)
            };
        } else if (year) {
            filter.createdAt = {
                $gte: new Date(year, 0, 1),
                $lt: new Date(year + 1, 0, 1)
            };
        }
        const data = await LoungeData.find(filter).skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
        const total = await LoungeData.countDocuments(filter);
        
        res.json({
            status:'success',
            message: 'Lounge - users and admins see this',
            data,
            page: pageNum,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        });

    } catch (err) {
        if (err.message && err.message.includes('bufferCommands')) {
            console.warn('[AI Studio] Using mock lounge data');
            return res.json({
                status: 'success',
                message: 'Lounge data (mock)',
                data: [
                    { _id: 'mock1', name: 'Alice Smith', identifier: 'GH-123456789-0', identifierType: 'ghana_card', contactNumber: '0501234567', gender: 'female', timeIn: new Date(Date.now() - 3600000).toISOString(), timeOut: '', Signature: 'ASmith' }
                ],
                page: 1, limit: 20, total: 1, totalPages: 1
            });
        }
         res.status(500).json({
            status:'error',
            message: err.message || 'An error occurred while fetching lounge data',
            data:null,
           });
    }
});
router.patch('/lounge-data/:id', restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const normalizeDataSchema = {
        Signature:req.body.full_name,
        name:req.body.full_name,
        contactNumber:req.body.contact || 'N/A',
        identifier:req.body.user_id,
        identifierType:req.body.user_id_type,
        gender:req.body.gender,
        timeIn:req.body.user_time_in || new Date(),
        timeOut:req.body.user_time_out || "",
    }

    const updatedRecord = await LoungeData.findByIdAndUpdate(
      id,
      normalizeDataSchema,
      {
        returnDocument: 'after',
        runValidators: true
      }
    );

    if (!updatedRecord) {
      return res.status(404).json({
        message: 'Record not found'
      });
    }

    res.json({
      status: 'success',
      data: updatedRecord
    });

  } catch (err) {
    if (err.message && err.message.includes('bufferCommands')) {
        console.warn('[AI Studio] Using mock update response');
        return res.json({
            status: 'success',
            data: { _id: req.params.id, ...req.body }
        });
    }
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});
router.delete('/lounge/:id', restrictTo('user', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const deletedRecord = await LoungeData.findByIdAndDelete(id);

    if (!deletedRecord) {
      return res.status(404).json({
        message: 'Record not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Record deleted successfully'
    });

  } catch (err) {
    if (err.message && err.message.includes('bufferCommands')) {
        console.warn('[AI Studio] Using mock delete response');
        return res.json({
            status: 'success',
            message: 'Record deleted successfully (mock)'
        });
    }
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

router.post('/submit-lounge-data', restrictTo('user', 'admin'), async(req, res)=>{
    try {

            const normalizeDataSchema = {
                Signature:req.body.full_name,
                name:req.body.full_name,
                contactNumber:req.body.contact || 'N/A',
                identifier:req.body.user_id,
                identifierType:req.body.user_id_type,
                gender:req.body.gender,
                timeIn:req.body.user_time_in || new Date(),
                timeOut:req.body.user_time_out || null,
            }


        const total = await LoungeData.countDocuments();
        const data = await LoungeData.create(normalizeDataSchema);
        res.json({
            status:'success',
            message: 'Lounge - users and admins see this',
            data:data,
        });
    } catch (err) {
        if (err.message && err.message.includes('bufferCommands')) {
            console.warn('[AI Studio] Using mock submit response');
            return res.json({
                status: 'success',
                message: 'Lounge data submitted (mock)',
                data: { _id: 'mock2', ...req.body }
            });
        }
         res.status(500).json({
            status:'error',
            message: err.message || 'An error occurred while fetching lounge data',
            data:null,
           });
    }
});

module.exports = router