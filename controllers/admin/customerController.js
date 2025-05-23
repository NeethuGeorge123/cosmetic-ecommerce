const User=require("../../models/userSignupSchema")




const customerInfo=async(req,res)=>{
    try {
        
        let search="";
        if(req.query.search){
            search=req.query.search;
        }
        let page=1;
        if(req.query.page){
            page=req.query.page
        }
        const limit=3
        const userData=await User.find({
            isAdmin:false,
            $or:[
                {
                    name:{$regex:".*"+search+".*",$options:"i"},
                    
                },
                {
                    email:{$regex:".*"+search+".*",$options:"i"}
                }
            ]
        }).limit(limit)
        .skip((page-1)*limit)
        .exec();

        const count=await User.find({

            isAdmin:false,
            $or:[
                {
                    name:{$regex:".*"+search+".*",$options:"i"},
                    
                },
                {
                    email:{$regex:".*"+search+".*",$options:"i"}
                }
            ],
        }).countDocuments();

        res.render("admin/customers",{
            data:userData,
            currentPage:page,
            totalPages:Math.ceil(count/limit)
        });


    } catch (error) {
        
        console.error("Error fetching customers:", error);
        res.redirect("/pageerror");
    }
}


const customerBlocked=async(req,res)=>{
    try {
        
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror")
    }
}



const customerunBlocked=async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror")
    }
}



module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked,
}