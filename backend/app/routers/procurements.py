from fastapi import APIRouter

router = APIRouter()

procurement_list = []

@router.post("/procurements")
def add_procurement(procurement: dict):

    procurement["id"] = len(procurement_list) + 1

    procurement_list.append(procurement)

    return {
        "message": "Procurement Request Saved Successfully"
    }


@router.get("/procurements")
def get_procurements():

    return procurement_list
@router.delete("/procurements/{procurement_id}")
def delete_procurement(procurement_id: int):

    for procurement in procurement_list:
        if procurement["id"] == procurement_id:
            procurement_list.remove(procurement)

            return {
                "message": "Procurement Deleted Successfully"
            }

    return {
        "message": "Procurement Not Found"
    }
@router.put("/procurements/{procurement_id}")
def update_procurement(procurement_id: int, updated_data: dict):

    for procurement in procurement_list:

        if procurement["id"] == procurement_id:

            procurement.update(updated_data)

            return {
                "message": "Procurement Updated Successfully"
            }

    return {
        "message": "Procurement Not Found"
    }